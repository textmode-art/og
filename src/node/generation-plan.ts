import path from 'node:path';
import {
	MAX_OG_DARKEN,
	MAX_OG_FRAME,
	MIN_OG_DARKEN,
	MIN_OG_FRAME,
	OG_DEFAULTS,
	type OgBrandingOverrides,
	type OgImageJob,
	type OgLayout,
	type OgSketchSource,
	type ResolvedOgBranding,
} from '../shared/public-contracts.js';
import { OgGenerationError, asOgGenerationError } from './errors.js';
import { resolveBranding } from './branding.js';

export interface NormalizedOgJob extends Omit<OgImageJob, 'id' | 'frame' | 'darken' | 'outputPath'> {
	readonly id: string;
	readonly frame: number;
	readonly darken: number;
	readonly outputPath: string;
}

export interface GenerationPlan {
	readonly branding: ResolvedOgBranding;
	readonly jobs: readonly NormalizedOgJob[];
}

export async function compileGenerationPlan(options: unknown): Promise<GenerationPlan> {
	if (!isRecord(options) || !Array.isArray(options.jobs)) {
		throw invalidRequest('generateOgImages expects an object containing a jobs array.');
	}
	if (options.jobs.length === 0) {
		return Object.freeze({ branding: await resolvePlanBranding(options.branding), jobs: Object.freeze([]) });
	}

	const jobs = options.jobs.map((job, index) => normalizeJob(job, index));
	const outputPaths = new Set<string>();
	for (const job of jobs) {
		if (outputPaths.has(job.outputPath)) {
			throw invalidRequest(`OG jobs must not share an output path: ${job.outputPath}.`);
		}
		outputPaths.add(job.outputPath);
	}

	return Object.freeze({
		branding: await resolvePlanBranding(options.branding),
		jobs: Object.freeze(jobs),
	});
}

function normalizeJob(value: unknown, index: number): NormalizedOgJob {
	if (!isRecord(value)) throw invalidRequest(`OG job #${index + 1} must be an object.`);
	const source = normalizeSource(value.source, index);
	const layout = normalizeLayout(value.layout, index);
	const outputPath = normalizeString(value.outputPath, `OG job #${index + 1} outputPath`);
	const defaults = OG_DEFAULTS[layout.kind];
	const frame = normalizeInteger(value.frame ?? defaults.frame, MIN_OG_FRAME, MAX_OG_FRAME, 'OG frame');
	const darken = normalizeInteger(value.darken ?? defaults.darken, MIN_OG_DARKEN, MAX_OG_DARKEN, 'OG darken');
	const absoluteOutputPath = path.resolve(outputPath);
	const id =
		typeof value.id === 'string' && value.id.trim() ? value.id.trim() : defaultJobId(absoluteOutputPath, index);

	return Object.freeze({
		id,
		source,
		outputPath: absoluteOutputPath,
		layout,
		frame,
		darken,
	});
}

function normalizeSource(value: unknown, index: number): OgSketchSource {
	if (!isRecord(value) || typeof value.kind !== 'string') {
		throw invalidRequest(`OG job #${index + 1} must provide a valid sketch source.`);
	}
	switch (value.kind) {
		case 'file':
			return Object.freeze({
				kind: 'file',
				path: normalizeString(value.path, `OG job #${index + 1} source path`),
			});
		case 'code': {
			const code = normalizeString(value.code, `OG job #${index + 1} source code`);
			const assetRoot = value.assetRoot === undefined ? undefined : normalizeString(value.assetRoot, 'assetRoot');
			return Object.freeze({
				kind: 'code',
				code,
				...(assetRoot === undefined ? {} : { assetRoot: path.resolve(assetRoot) }),
			});
		}
		case 'editor-share-url':
			return Object.freeze({ kind: 'editor-share-url', url: normalizeString(value.url, 'editor share URL') });
		default:
			throw invalidRequest(`Unsupported sketch source kind: ${value.kind}.`);
	}
}

function normalizeLayout(value: unknown, index: number): OgLayout {
	if (!isRecord(value) || (value.kind !== 'gallery' && value.kind !== 'main')) {
		throw invalidRequest(`OG job #${index + 1} must use the gallery or main layout.`);
	}
	if (value.kind === 'main') return Object.freeze({ kind: 'main' });
	if (typeof value.title !== 'string' || !value.title.trim()) {
		throw invalidRequest(`Gallery OG job #${index + 1} must provide a non-empty title.`);
	}
	const title = value.title;
	const description = normalizeOptionalText(value.description, `Gallery OG job #${index + 1} description`);
	const authorName = normalizeOptionalText(value.authorName, `Gallery OG job #${index + 1} authorName`);
	return Object.freeze({
		kind: 'gallery',
		title,
		...(description === undefined ? {} : { description }),
		...(authorName === undefined ? {} : { authorName }),
	});
}

async function resolvePlanBranding(value: unknown): Promise<ResolvedOgBranding> {
	if (value !== undefined && !isRecord(value)) {
		throw new OgGenerationError('Branding overrides must be an object.', {
			code: 'INVALID_BRANDING',
			stage: 'plan',
		});
	}
	if (isRecord(value)) {
		if (value.logoPath !== undefined && typeof value.logoPath !== 'string') {
			throw new OgGenerationError('Branding logoPath must be a string.', {
				code: 'INVALID_BRANDING',
				stage: 'plan',
			});
		}
		if (value.labels !== undefined && !isRecord(value.labels)) {
			throw new OgGenerationError('Branding labels must be an object.', {
				code: 'INVALID_BRANDING',
				stage: 'plan',
			});
		}
	}
	try {
		return await resolveBranding(value as OgBrandingOverrides | undefined);
	} catch (error) {
		throw asOgGenerationError(error, { code: 'INVALID_BRANDING', stage: 'plan' });
	}
}

function normalizeString(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.trim().length === 0)
		throw invalidRequest(`${label} must be a non-empty string.`);
	return value.trim();
}

function normalizeOptionalText(value: unknown, label: string): string | null | undefined {
	if (value === undefined || value === null) return value;
	return normalizeString(value, label);
}

function normalizeInteger(value: unknown, minimum: number, maximum: number, label: string): number {
	if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
		throw invalidRequest(`${label} must be an integer from ${minimum} to ${maximum}.`);
	}
	return value as number;
}

function defaultJobId(outputPath: string, index: number): string {
	return path.basename(outputPath, path.extname(outputPath)) || `job-${index + 1}`;
}

function invalidRequest(message: string): OgGenerationError {
	return new OgGenerationError(message, { code: 'INVALID_REQUEST', stage: 'plan' });
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
