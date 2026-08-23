import { chromium, type Browser, type BrowserContext } from 'playwright';
import { OG_HEIGHT, OG_WIDTH, type OgLayout, type ResolvedOgBranding } from '../shared/public-contracts.js';
import {
	PREVIEW_PROTOCOL_VERSION,
	isPreviewOutcome,
	type PreviewMetadata,
	type PreviewOutcome,
	type PreviewRenderRequest,
} from '../shared/preview-protocol.js';
import { OgGenerationError, addCleanupDiagnostics, asOgGenerationError, type CleanupDiagnostic } from './errors.js';
import { startPreviewServer, type PreviewServer } from './preview-server.js';

export const DEFAULT_RENDER_TIMEOUT_MS = 30_000;

const CHROMIUM_ARGS = [
	'--disable-dev-shm-usage',
	'--enable-webgl',
	'--ignore-gpu-blocklist',
	'--use-gl=angle',
	'--use-angle=swiftshader-webgl',
	'--enable-unsafe-swiftshader',
] as const;

export function chromiumLaunchArguments(disableSandbox = false): readonly string[] {
	return disableSandbox ? [...CHROMIUM_ARGS, '--no-sandbox', '--disable-setuid-sandbox'] : [...CHROMIUM_ARGS];
}

export interface PreviewRenderInput {
	readonly jobId: string;
	readonly code: string;
	readonly assetRoot?: string;
	readonly frame: number;
	readonly darken: number;
	readonly layout: OgLayout;
	readonly branding: ResolvedOgBranding;
}

export interface RenderedPng {
	readonly bytes: Uint8Array;
	readonly metadata: PreviewMetadata;
}

export interface PreviewRenderer {
	render(input: PreviewRenderInput, signal: AbortSignal): Promise<RenderedPng>;
	close(): Promise<void>;
}

export interface PlaywrightPreviewRendererOptions {
	readonly renderTimeoutMs?: number;
	readonly disableSandbox?: boolean;
	readonly previewRoot?: string;
}

export class PlaywrightPreviewRenderer implements PreviewRenderer {
	private browser: Browser | undefined;
	private server: PreviewServer | undefined;
	private startPromise: Promise<void> | undefined;
	private closed = false;
	private readonly options: Required<Pick<PlaywrightPreviewRendererOptions, 'renderTimeoutMs' | 'disableSandbox'>> &
		Pick<PlaywrightPreviewRendererOptions, 'previewRoot'>;

	constructor(options: PlaywrightPreviewRendererOptions = {}) {
		this.options = {
			renderTimeoutMs: options.renderTimeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS,
			disableSandbox: options.disableSandbox ?? false,
			previewRoot: options.previewRoot,
		};
	}

	async render(input: PreviewRenderInput, signal: AbortSignal): Promise<RenderedPng> {
		if (this.closed)
			throw new OgGenerationError('Preview renderer is closed.', {
				code: 'SESSION_START_FAILED',
				stage: 'session',
			});
		await this.ensureStarted();
		const server = this.server;
		const browser = this.browser;
		if (!server || !browser)
			throw new OgGenerationError('Preview renderer did not start.', {
				code: 'SESSION_START_FAILED',
				stage: 'session',
			});

		const registration = server.registerAssetRoot(input.assetRoot);
		let context: BrowserContext | undefined;
		let primaryError: unknown;
		let rendered: RenderedPng | undefined;
		try {
			context = await browser.newContext({
				viewport: { width: OG_WIDTH, height: OG_HEIGHT },
				deviceScaleFactor: 1,
			});
			const work = this.renderInContext(context, registration.url, input);
			rendered = await raceWithDeadline(work, signal, this.options.renderTimeoutMs, input.jobId, () =>
				boundedClose(context)
			);
		} catch (error) {
			primaryError = error;
		}
		const diagnostics = await settleCleanup([
			['asset registration disposal', () => registration.dispose()],
			['browser context closure', () => boundedClose(context)],
		]);
		if (diagnostics.length > 0 && primaryError) {
			throw addCleanupDiagnostics(
				asOgGenerationError(primaryError, { code: 'CAPTURE_FAILED', stage: 'capture', jobId: input.jobId }),
				diagnostics
			);
		}
		if (diagnostics.length > 0) {
			throw new OgGenerationError(`Could not clean up render job "${input.jobId}".`, {
				code: 'CLEANUP_FAILED',
				stage: 'capture',
				jobId: input.jobId,
				cleanupDiagnostics: diagnostics,
			});
		}
		if (primaryError)
			throw asOgGenerationError(primaryError, { code: 'CAPTURE_FAILED', stage: 'capture', jobId: input.jobId });
		return rendered!;
	}

	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		const diagnostics = await settleCleanup([
			['browser closure', () => boundedClose(this.browser)],
			['preview server closure', () => boundedClose(this.server)],
		]);
		this.browser = undefined;
		this.server = undefined;
		if (diagnostics.length > 0) {
			throw new OgGenerationError('Could not close the OG rendering session.', {
				code: 'CLEANUP_FAILED',
				stage: 'session',
				cleanupDiagnostics: diagnostics,
			});
		}
	}

	private async ensureStarted(): Promise<void> {
		if (this.browser && this.server) return;
		this.startPromise ??= this.start();
		try {
			await this.startPromise;
		} catch (error) {
			this.startPromise = undefined;
			throw asOgGenerationError(error, { code: 'SESSION_START_FAILED', stage: 'session' });
		}
	}

	private async start(): Promise<void> {
		try {
			this.server = await startPreviewServer(this.options.previewRoot);
			this.browser = await launchChromium(this.options.disableSandbox);
		} catch (error) {
			await settleCleanup([
				['browser closure', () => boundedClose(this.browser)],
				['preview server closure', () => boundedClose(this.server)],
			]);
			throw error;
		}
	}

	private async renderInContext(
		context: BrowserContext,
		url: string,
		input: PreviewRenderInput
	): Promise<RenderedPng> {
		const page = await context.newPage();
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));
		try {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.renderTimeoutMs });
			await page.waitForFunction(
				() => typeof (globalThis as unknown as { renderOg?: unknown }).renderOg === 'function',
				undefined,
				{ timeout: this.options.renderTimeoutMs }
			);
			const request: PreviewRenderRequest = {
				protocolVersion: PREVIEW_PROTOCOL_VERSION,
				code: input.code,
				frame: input.frame,
				darken: input.darken,
				layout: input.layout,
				branding: input.branding,
			};
			let rawOutcome: unknown;
			try {
				rawOutcome = await page.evaluate(
					(previewRequest) =>
						(
							globalThis as unknown as {
								renderOg(request: PreviewRenderRequest): Promise<PreviewOutcome>;
							}
						).renderOg(previewRequest),
					request
				);
			} catch (error) {
				const details = pageErrors.at(-1) ?? (error instanceof Error ? error.message : String(error));
				throw new OgGenerationError(`Preview evaluation failed: ${details}`, {
					code: 'SKETCH_FAILED',
					stage: 'render',
					jobId: input.jobId,
					cause: error,
				});
			}
			if (!isPreviewOutcome(rawOutcome)) {
				throw new OgGenerationError('Preview returned an invalid or incompatible protocol outcome.', {
					code: 'PROTOCOL_MISMATCH',
					stage: 'render',
					jobId: input.jobId,
				});
			}
			const outcome = rawOutcome as PreviewOutcome;
			if (!outcome.ok) {
				throw new OgGenerationError(outcome.error.message, {
					code: outcome.error.code,
					stage: outcome.error.code === 'LAYOUT_FAILED' ? 'layout' : 'render',
					jobId: input.jobId,
				});
			}
			assertPreviewMetadata(outcome.metadata, input);
			const bytes = await page.screenshot({
				clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
				animations: 'disabled',
				type: 'png',
			});
			return { bytes, metadata: outcome.metadata };
		} catch (error) {
			throw asOgGenerationError(error, { code: 'CAPTURE_FAILED', stage: 'capture', jobId: input.jobId });
		} finally {
			page.removeAllListeners();
		}
	}
}

async function launchChromium(disableSandbox: boolean): Promise<Browser> {
	try {
		return await chromium.launch({
			headless: true,
			channel: 'chromium',
			args: [...chromiumLaunchArguments(disableSandbox)],
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

function assertPreviewMetadata(metadata: PreviewMetadata, input: PreviewRenderInput): void {
	if (metadata.frame !== input.frame) {
		throw new OgGenerationError(`Preview rendered frame ${metadata.frame}; expected ${input.frame}.`, {
			code: 'SKETCH_FAILED',
			stage: 'render',
			jobId: input.jobId,
		});
	}
	if (metadata.layout !== input.layout.kind) {
		throw new OgGenerationError(`Preview rendered ${metadata.layout}; expected ${input.layout.kind}.`, {
			code: 'LAYOUT_FAILED',
			stage: 'layout',
			jobId: input.jobId,
		});
	}
}

async function raceWithDeadline<T>(
	work: Promise<T>,
	signal: AbortSignal,
	timeoutMs: number,
	jobId: string,
	interrupt: () => Promise<void>
): Promise<T> {
	let timer = 0;
	let abortHandler: (() => void) | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			void interrupt().catch(() => undefined);
			reject(
				new OgGenerationError(`Rendering job "${jobId}" exceeded its ${timeoutMs}ms deadline.`, {
					code: 'RENDER_TIMEOUT',
					stage: 'render',
					jobId,
				})
			);
		}, timeoutMs) as unknown as number;
		abortHandler = () => {
			void interrupt().catch(() => undefined);
			reject(
				new OgGenerationError(`Rendering job "${jobId}" was aborted.`, {
					code: 'RENDER_TIMEOUT',
					stage: 'render',
					jobId,
				})
			);
		};
		signal.addEventListener('abort', abortHandler, { once: true });
	});
	try {
		return await Promise.race([work, deadline]);
	} finally {
		clearTimeout(timer);
		if (abortHandler) signal.removeEventListener('abort', abortHandler);
	}
}

async function boundedClose(value: { close(): Promise<void> } | undefined): Promise<void> {
	if (!value) return;
	const completed = await Promise.race([
		value.close().then(() => true),
		new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1_000)),
	]);
	if (!completed) throw new Error('Timed out while closing a renderer resource.');
}

async function settleCleanup(
	operations: readonly [string, () => void | Promise<void>][]
): Promise<CleanupDiagnostic[]> {
	const results = await Promise.allSettled(operations.map(([, operation]) => Promise.resolve().then(operation)));
	return results.flatMap((result, index) =>
		result.status === 'fulfilled'
			? []
			: [
					{
						operation: operations[index]![0],
						message: result.reason instanceof Error ? result.reason.message : String(result.reason),
						cause: result.reason,
					},
				]
	);
}
