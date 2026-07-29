import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OgBrandingLabels, OgBrandingOverrides, ResolvedOgBranding } from '../shared/contracts.js';

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
			throw new Error(`Branding label "${name}" must be a non-empty string.`);
		}
		labels[name as keyof OgBrandingLabels] = value.trim();
	}

	let logoSvg = DEFAULT_LOGO_SVG;
	if (overrides?.logoPath !== undefined) {
		if (typeof overrides.logoPath !== 'string' || overrides.logoPath.trim().length === 0) {
			throw new Error('Branding logoPath must be a non-empty string.');
		}
		const logoPath = path.resolve(baseDirectory, overrides.logoPath);
		try {
			logoSvg = await readFile(logoPath, 'utf8');
		} catch (error) {
			throw new Error(`Could not read branding logo: ${logoPath}`, { cause: error });
		}
	}
	assertSvgLogo(logoSvg);
	return { logoSvg, labels };
}

export function assertSvgLogo(value: string): void {
	const rootMatch = value.match(/<svg\b([^>]*)>/i);
	if (!rootMatch) throw new Error('Branding logo must contain an SVG root element.');
	if (!/\bviewBox\s*=\s*["'][^"']+["']/i.test(rootMatch[1] ?? '')) {
		throw new Error('Branding logo SVG must declare a viewBox.');
	}
	if (!/<(?:path|rect|circle|ellipse|polygon|polyline|line|text|g)\b/i.test(value)) {
		throw new Error('Branding logo SVG does not contain drawable content.');
	}
}

export async function readBrandingConfig(configPath: string): Promise<OgBrandingOverrides> {
	const absolutePath = path.resolve(configPath);
	let value: unknown;
	try {
		value = JSON.parse(await readFile(absolutePath, 'utf8')) as unknown;
	} catch (error) {
		throw new Error(`Could not read valid branding JSON: ${absolutePath}`, { cause: error });
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Branding JSON must contain an object: ${absolutePath}`);
	}
	const overrides = value as OgBrandingOverrides;
	if (overrides.logoPath !== undefined) {
		overrides.logoPath = path.resolve(path.dirname(absolutePath), overrides.logoPath);
	}
	await resolveBranding(overrides);
	return overrides;
}
