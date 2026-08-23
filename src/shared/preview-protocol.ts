import type { OgLayout, ResolvedOgBranding } from './public-contracts.js';

export const PREVIEW_PROTOCOL_VERSION = 1 as const;

export interface PreviewRenderRequest {
	readonly protocolVersion: typeof PREVIEW_PROTOCOL_VERSION;
	readonly code: string;
	readonly frame: number;
	readonly darken: number;
	readonly layout: OgLayout;
	readonly branding: ResolvedOgBranding;
}

export interface PreviewMetadata {
	readonly frame: number;
	readonly seconds: number;
	readonly descriptionLines: number;
	readonly layout: OgLayout['kind'];
}

export type PreviewFailureCode = 'INVALID_REQUEST' | 'SKETCH_FAILED' | 'LAYOUT_FAILED';

export interface PreviewFailure {
	readonly code: PreviewFailureCode;
	readonly message: string;
}

export type PreviewOutcome =
	| {
			readonly protocolVersion: typeof PREVIEW_PROTOCOL_VERSION;
			readonly ok: true;
			readonly metadata: PreviewMetadata;
	  }
	| {
			readonly protocolVersion: typeof PREVIEW_PROTOCOL_VERSION;
			readonly ok: false;
			readonly error: PreviewFailure;
	  };

export function isPreviewOutcome(value: unknown): value is PreviewOutcome {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	if (candidate.protocolVersion !== PREVIEW_PROTOCOL_VERSION || typeof candidate.ok !== 'boolean') return false;
	if (candidate.ok) {
		const metadata = candidate.metadata;
		if (!metadata || typeof metadata !== 'object') return false;
		const result = metadata as Record<string, unknown>;
		return (
			typeof result.frame === 'number' &&
			typeof result.seconds === 'number' &&
			typeof result.descriptionLines === 'number' &&
			(result.layout === 'gallery' || result.layout === 'main')
		);
	}
	const error = candidate.error;
	if (!error || typeof error !== 'object') return false;
	const failure = error as Record<string, unknown>;
	return typeof failure.code === 'string' && typeof failure.message === 'string';
}

export function isPreviewRenderRequest(value: unknown): value is PreviewRenderRequest {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return (
		candidate.protocolVersion === PREVIEW_PROTOCOL_VERSION &&
		typeof candidate.code === 'string' &&
		Number.isInteger(candidate.frame) &&
		Number.isInteger(candidate.darken) &&
		isLayout(candidate.layout) &&
		isBranding(candidate.branding)
	);
}

function isLayout(value: unknown): boolean {
	if (!value || typeof value !== 'object') return false;
	const layout = value as Record<string, unknown>;
	if (layout.kind === 'main') return true;
	return layout.kind === 'gallery' && typeof layout.title === 'string' && layout.title.trim().length > 0;
}

function isBranding(value: unknown): boolean {
	if (!value || typeof value !== 'object') return false;
	const branding = value as Record<string, unknown>;
	if (typeof branding.logoSvg !== 'string' || !branding.labels || typeof branding.labels !== 'object') return false;
	return Object.values(branding.labels as Record<string, unknown>).every(
		(label) => typeof label === 'string' && label.trim().length > 0
	);
}
