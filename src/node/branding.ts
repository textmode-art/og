import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OgBrandingLabels, OgBrandingOverrides, ResolvedOgBranding } from '../shared/public-contracts.js';
import { OgGenerationError } from './errors.js';

const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768">
	<path d="M288 288H192V192H96V96H0V0H192V96H288V192H384V288H480V384H384V480H288V576H192V672H0V576H96V480H192V384H288ZM384 576H768V672H384Z" />
</svg>`;

export const DEFAULT_OG_LABELS: Readonly<OgBrandingLabels> = {
	brandName: 'editor.textmode.art',
	galleryBadge: 'GALLERY SKETCH',
	galleryAuthorPrefix: 'by',
	mainTopRight: 'FREE + OPEN SOURCE',
	mainHeadlinePrefix: 'CREATE',
	mainHeadlineEmphasis: 'TEXTMODE',
	mainHeadlineSecondLine: 'IN YOUR BROWSER',
	mainBottomLeft: 'LIVE CODE / CHARACTER GRAPHICS',
	mainBottomRight: 'BROWSER-BASED / TEXTMODE.JS',
};

export async function resolveBranding(
	overrides: OgBrandingOverrides | undefined,
	baseDirectory = process.cwd()
): Promise<ResolvedOgBranding> {
	const labels = {
		...DEFAULT_OG_LABELS,
		...overrides?.labels,
	};
	for (const [name, value] of Object.entries(labels)) {
		if (typeof value !== 'string' || value.trim().length === 0) {
			throw new OgGenerationError(`Branding label "${name}" must be a non-empty string.`, {
				code: 'INVALID_BRANDING',
				stage: 'plan',
			});
		}
		labels[name as keyof OgBrandingLabels] = value.trim();
	}

	let logoSvg = DEFAULT_LOGO_SVG;
	if (overrides?.logoPath !== undefined) {
		if (typeof overrides.logoPath !== 'string' || overrides.logoPath.trim().length === 0) {
			throw new OgGenerationError('Branding logoPath must be a non-empty string.', {
				code: 'INVALID_BRANDING',
				stage: 'plan',
			});
		}
		const logoPath = path.resolve(baseDirectory, overrides.logoPath);
		try {
			logoSvg = await readFile(logoPath, 'utf8');
		} catch (error) {
			throw new OgGenerationError(`Could not read branding logo: ${logoPath}`, {
				code: 'INVALID_BRANDING',
				stage: 'plan',
				cause: error,
			});
		}
	}
	assertSvgLogo(logoSvg);
	return Object.freeze({ logoSvg, labels: Object.freeze(labels) });
}

export function assertSvgLogo(value: string): void {
	const rootMatch = value.match(/<svg\b([^>]*)>/i);
	if (!rootMatch)
		throw new OgGenerationError('Branding logo must contain an SVG root element.', {
			code: 'INVALID_BRANDING',
			stage: 'plan',
		});
	if (!/\bviewBox\s*=\s*["'][^"']+["']/i.test(rootMatch[1] ?? '')) {
		throw new OgGenerationError('Branding logo SVG must declare a viewBox.', {
			code: 'INVALID_BRANDING',
			stage: 'plan',
		});
	}
	if (!/<(?:path|rect|circle|ellipse|polygon|polyline|line|text|g)\b/i.test(value)) {
		throw new OgGenerationError('Branding logo SVG does not contain drawable content.', {
			code: 'INVALID_BRANDING',
			stage: 'plan',
		});
	}
}

export async function readBrandingConfig(configPath: string): Promise<OgBrandingOverrides> {
	const absolutePath = path.resolve(configPath);
	let value: unknown;
	try {
		value = JSON.parse(await readFile(absolutePath, 'utf8')) as unknown;
	} catch (error) {
		throw new OgGenerationError(`Could not read valid branding JSON: ${absolutePath}`, {
			code: 'INVALID_BRANDING',
			stage: 'plan',
			cause: error,
		});
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new OgGenerationError(`Branding JSON must contain an object: ${absolutePath}`, {
			code: 'INVALID_BRANDING',
			stage: 'plan',
		});
	}
	const raw = value as Record<string, unknown>;
	const overrides = (
		typeof raw.branding === 'object' && raw.branding !== null && !Array.isArray(raw.branding) ? raw.branding : raw
	) as OgBrandingOverrides;
	if (overrides.logoPath !== undefined) {
		if (typeof overrides.logoPath !== 'string' || overrides.logoPath.trim().length === 0) {
			throw new OgGenerationError('Branding logoPath must be a non-empty string.', {
				code: 'INVALID_BRANDING',
				stage: 'plan',
			});
		}
		overrides.logoPath = path.resolve(path.dirname(absolutePath), overrides.logoPath);
	}
	await resolveBranding(overrides);
	return overrides;
}
