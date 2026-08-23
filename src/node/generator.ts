import { compileGenerationPlan, type GenerationPlan, type NormalizedOgJob } from './generation-plan.js';
import { addCleanupDiagnostics, asOgGenerationError, OgGenerationError, type CleanupDiagnostic } from './errors.js';
import { commitOgPng } from './png-output.js';
import {
	PlaywrightPreviewRenderer,
	type PreviewRenderInput,
	type PreviewRenderer,
	type RenderedPng,
} from './preview-renderer.js';
import { resolveSketchSource } from './source.js';
import type { GenerateOgImagesOptions, OgImageResult } from '../shared/public-contracts.js';

type RendererFactory = () => PreviewRenderer | Promise<PreviewRenderer>;
type RenderStage = 'prepare' | 'render' | 'capture' | 'validate' | 'commit';

export async function generateOgImages(options: GenerateOgImagesOptions): Promise<readonly OgImageResult[]> {
	return generateOgImagesWithRenderer(options, () => new PlaywrightPreviewRenderer());
}

/** Internal seam used by fast generator and failure-path tests; not part of the package entry point. */
export async function generateOgImagesWithRenderer(
	options: GenerateOgImagesOptions,
	rendererFactory: RendererFactory
): Promise<readonly OgImageResult[]> {
	const plan = await compileGenerationPlan(options);
	if (plan.jobs.length === 0) return [];

	let renderer: PreviewRenderer | undefined;
	let primaryError: OgGenerationError | undefined;
	const results: OgImageResult[] = [];
	try {
		renderer = await rendererFactory();
		for (const job of plan.jobs) results.push(await renderJob(renderer, job, plan));
	} catch (error) {
		primaryError = asOgGenerationError(error, { code: 'SESSION_START_FAILED', stage: 'session' });
	}
	if (renderer) {
		try {
			await renderer.close();
		} catch (error) {
			const cleanupError = asOgGenerationError(error, { code: 'CLEANUP_FAILED', stage: 'session' });
			if (primaryError) addCleanupDiagnostics(primaryError, diagnosticsFrom(cleanupError));
			else primaryError = cleanupError;
		}
	}
	if (primaryError) throw primaryError;
	return results;
}

async function renderJob(
	renderer: PreviewRenderer,
	job: NormalizedOgJob,
	plan: GenerationPlan
): Promise<OgImageResult> {
	let stage: RenderStage = 'prepare';
	try {
		const source = await resolveSketchSource(job.source);
		const input: PreviewRenderInput = {
			jobId: job.id,
			code: source.code,
			assetRoot: source.assetRoot,
			frame: job.frame,
			darken: job.darken,
			layout: job.layout,
			branding: plan.branding,
		};
		stage = 'render';
		const rendered = await renderer.render(input, new AbortController().signal);
		stage = 'commit';
		await commitRenderedPng(rendered, job.outputPath);
		return {
			id: job.id,
			outputPath: job.outputPath,
			layout: rendered.metadata.layout,
			frame: rendered.metadata.frame,
			seconds: rendered.metadata.seconds,
			descriptionLines: rendered.metadata.descriptionLines,
		};
	} catch (error) {
		const normalized = asOgGenerationError(error, {
			code:
				stage === 'prepare'
					? 'SOURCE_READ_FAILED'
					: stage === 'render'
						? 'SKETCH_FAILED'
						: stage === 'commit'
							? 'OUTPUT_COMMIT_FAILED'
							: 'INVALID_OUTPUT_IMAGE',
			stage,
			jobId: job.id,
		});
		const message = `Could not generate ${job.layout.kind} OG image for "${job.id}" during ${stage}: ${normalized.message}`;
		throw new OgGenerationError(message, {
			code: normalized.code,
			stage: normalized.stage,
			jobId: job.id,
			cause: normalized,
			cleanupDiagnostics: normalized.cleanupDiagnostics,
		});
	}
}

async function commitRenderedPng(rendered: RenderedPng, outputPath: string): Promise<void> {
	try {
		await commitOgPng(rendered.bytes, outputPath);
	} catch (error) {
		throw asOgGenerationError(error, { code: 'OUTPUT_COMMIT_FAILED', stage: 'commit' });
	}
}

function diagnosticsFrom(error: OgGenerationError): CleanupDiagnostic[] {
	if (error.cleanupDiagnostics.length > 0) return error.cleanupDiagnostics;
	return [{ operation: 'renderer closure', message: error.message, cause: error.cause }];
}
