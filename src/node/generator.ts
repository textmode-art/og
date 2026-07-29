import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import {
	MAX_OG_DARKEN,
	MAX_OG_FRAME,
	MIN_OG_DARKEN,
	MIN_OG_FRAME,
	OG_DEFAULTS,
	OG_HEIGHT,
	OG_WIDTH,
	type GenerateOgImagesOptions,
	type OgImageJob,
	type OgImageResult,
	type OgPreviewRequest,
	type OgPreviewResult,
} from '../shared/contracts.js';
import { resolveBranding } from './branding.js';
import { assertOgPng } from './image.js';
import { startPreviewServer, type PreviewServer } from './preview-server.js';
import { resolveSketchSource } from './source.js';

const CAPTURE_TIMEOUT_MS = 30_000;
const CHROMIUM_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--enable-webgl',
	'--ignore-gpu-blocklist',
	'--use-gl=angle',
	'--use-angle=swiftshader-webgl',
	'--enable-unsafe-swiftshader',
] as const;

type RenderStage = 'prepare' | 'navigate' | 'render' | 'capture' | 'validate' | 'commit';

export async function generateOgImages(options: GenerateOgImagesOptions): Promise<readonly OgImageResult[]> {
	if (!options || !Array.isArray(options.jobs)) {
		throw new TypeError('generateOgImages expects an object containing a jobs array.');
	}
	if (options.jobs.length === 0) return [];
	const branding = await resolveBranding(options.branding);
	const jobs = options.jobs.map(normalizeJob);
	let server: PreviewServer | undefined;
	let browser: Browser | undefined;

	try {
		server = await startPreviewServer();
		browser = await launchChromium();
		const results: OgImageResult[] = [];
		for (const job of jobs) {
			results.push(await renderJob(browser, server, job, branding));
		}
		return results;
	} catch (error) {
		if (error instanceof OgGenerationError) throw error;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not start the OG rendering session: ${message}`, { cause: error });
	} finally {
		await Promise.allSettled([browser?.close(), server?.close()]);
	}
}

interface NormalizedJob extends OgImageJob {
	id: string;
	frame: number;
	darken: number;
	outputPath: string;
}

function normalizeJob(job: OgImageJob, index: number): NormalizedJob {
	if (!job || typeof job !== 'object') throw new TypeError(`OG job #${index + 1} must be an object.`);
	if (!job.source || typeof job.source !== 'object') {
		throw new TypeError(`OG job #${index + 1} must provide a sketch source.`);
	}
	if (!job.layout || (job.layout.kind !== 'gallery' && job.layout.kind !== 'main')) {
		throw new TypeError(`OG job #${index + 1} must use the gallery or main layout.`);
	}
	if (job.layout.kind === 'gallery' && (!job.layout.title || !job.layout.title.trim())) {
		throw new TypeError(`Gallery OG job #${index + 1} must provide a non-empty title.`);
	}
	if (typeof job.outputPath !== 'string' || !job.outputPath.trim()) {
		throw new TypeError(`OG job #${index + 1} must provide an outputPath.`);
	}
	const defaults = OG_DEFAULTS[job.layout.kind];
	const frame = job.frame ?? defaults.frame;
	const darken = job.darken ?? defaults.darken;
	if (!Number.isInteger(frame) || frame < MIN_OG_FRAME || frame > MAX_OG_FRAME) {
		throw new RangeError(`OG frame must be an integer from ${MIN_OG_FRAME} to ${MAX_OG_FRAME}.`);
	}
	if (!Number.isInteger(darken) || darken < MIN_OG_DARKEN || darken > MAX_OG_DARKEN) {
		throw new RangeError(`OG darken must be an integer from ${MIN_OG_DARKEN} to ${MAX_OG_DARKEN}.`);
	}
	const outputPath = path.resolve(job.outputPath);
	return {
		...job,
		id: job.id?.trim() || path.basename(outputPath, path.extname(outputPath)) || `job-${index + 1}`,
		outputPath,
		frame,
		darken,
	};
}

class OgGenerationError extends Error {}

async function renderJob(
	browser: Browser,
	server: PreviewServer,
	job: NormalizedJob,
	branding: Awaited<ReturnType<typeof resolveBranding>>
): Promise<OgImageResult> {
	const temporaryOutput = path.join(
		path.dirname(job.outputPath),
		`.${path.basename(job.outputPath)}.${randomUUID()}.tmp.png`
	);
	let context: BrowserContext | undefined;
	let registration: ReturnType<PreviewServer['registerAssetRoot']> | undefined;
	let stage: RenderStage = 'prepare';

	try {
		await mkdir(path.dirname(job.outputPath), { recursive: true });
		const source = await resolveSketchSource(job.source);
		registration = server.registerAssetRoot(source.assetRoot);
		context = await browser.newContext({
			viewport: { width: OG_WIDTH, height: OG_HEIGHT },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));

		stage = 'navigate';
		await page.goto(registration.url, {
			waitUntil: 'domcontentloaded',
			timeout: CAPTURE_TIMEOUT_MS,
		});
		await page.waitForFunction(() => typeof window.renderOg === 'function', undefined, {
			timeout: CAPTURE_TIMEOUT_MS,
		});

		stage = 'render';
		const request: OgPreviewRequest = {
			code: source.code,
			frame: job.frame,
			darken: job.darken,
			layout: job.layout,
			branding,
		};
		let previewResult: OgPreviewResult;
		try {
			previewResult = await page.evaluate((previewRequest) => window.renderOg(previewRequest), request);
		} catch (error) {
			const status = await page.locator('body').getAttribute('data-status');
			const previewError = await page.locator('body').getAttribute('data-error');
			const details =
				previewError ?? pageErrors.at(-1) ?? (error instanceof Error ? error.message : String(error));
			throw new Error(`Preview failed (${status ?? 'unknown'}): ${details}`, { cause: error });
		}
		if (previewResult.frame !== job.frame) {
			throw new Error(`Preview rendered frame ${previewResult.frame}; expected ${job.frame}.`);
		}
		if (previewResult.layout !== job.layout.kind) {
			throw new Error(`Preview rendered ${previewResult.layout}; expected ${job.layout.kind}.`);
		}
		if ((await page.locator('body').getAttribute('data-status')) !== 'ready') {
			throw new Error('Preview did not reach ready state.');
		}

		stage = 'capture';
		await page.screenshot({
			path: temporaryOutput,
			clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
			animations: 'disabled',
			type: 'png',
		});
		stage = 'validate';
		await assertOgPng(temporaryOutput);
		stage = 'commit';
		await rename(temporaryOutput, job.outputPath);
		return {
			id: job.id,
			outputPath: job.outputPath,
			layout: previewResult.layout,
			frame: previewResult.frame,
			seconds: previewResult.seconds,
			descriptionLines: previewResult.descriptionLines,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new OgGenerationError(
			`Could not generate ${job.layout.kind} OG image for "${job.id}" during ${stage}: ${message}`,
			{ cause: error }
		);
	} finally {
		registration?.dispose();
		await context?.close();
		await rm(temporaryOutput, { force: true });
	}
}

async function launchChromium(): Promise<Browser> {
	try {
		return await chromium.launch({
			headless: true,
			channel: 'chromium',
			args: [...CHROMIUM_ARGS],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
			throw new Error('Playwright Chromium is not installed. Run `textmode-og install-browser`, then retry.', {
				cause: error,
			});
		}
		throw new Error(`Could not launch the pinned Chromium renderer: ${message}`, { cause: error });
	}
}

declare global {
	interface Window {
		renderOg(request: OgPreviewRequest): Promise<OgPreviewResult>;
	}
}
