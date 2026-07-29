export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const MIN_OG_FRAME = 1;
export const MAX_OG_FRAME = 1000;
export const MIN_OG_DARKEN = 0;
export const MAX_OG_DARKEN = 100;

export const OG_DEFAULTS = {
	gallery: { frame: 60, darken: 55 },
	main: { frame: 60, darken: 70 },
} as const;

export type OgSketchSource =
	| { kind: 'file'; path: string }
	| { kind: 'code'; code: string; assetRoot?: string }
	| { kind: 'editor-share-url'; url: string };

export type GalleryOgLayout = {
	kind: 'gallery';
	title: string;
	description?: string | null;
	authorName?: string | null;
};

export type MainOgLayout = {
	kind: 'main';
};

export type OgLayout = GalleryOgLayout | MainOgLayout;

export interface OgImageJob {
	id?: string;
	source: OgSketchSource;
	outputPath: string;
	layout: OgLayout;
	frame?: number;
	darken?: number;
}

export interface OgBrandingLabels {
	brandName: string;
	galleryBadge: string;
	galleryAuthorPrefix: string;
	mainTopRight: string;
	mainHeadlinePrefix: string;
	mainHeadlineEmphasis: string;
	mainHeadlineSecondLine: string;
	mainBottomLeft: string;
	mainBottomRight: string;
}

export interface OgBrandingOverrides {
	logoPath?: string;
	labels?: Partial<OgBrandingLabels>;
}

export interface GenerateOgImagesOptions {
	jobs: readonly OgImageJob[];
	branding?: OgBrandingOverrides;
}

export interface OgImageResult {
	id: string;
	outputPath: string;
	layout: OgLayout['kind'];
	frame: number;
	seconds: number;
	descriptionLines: number;
}

export interface ResolvedOgBranding {
	logoSvg: string;
	labels: OgBrandingLabels;
}

export interface OgPreviewRequest {
	code: string;
	frame: number;
	darken: number;
	layout: OgLayout;
	branding: ResolvedOgBranding;
}

export interface OgPreviewResult {
	frame: number;
	seconds: number;
	descriptionLines: number;
	layout: OgLayout['kind'];
}

export function escapeMarkup(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}
