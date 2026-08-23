import type { OgLayout, ResolvedOgBranding } from '../shared/public-contracts';
import { mountGalleryOverlay } from './gallery-overlay';
import { mountMainOverlay } from './main-overlay';

export interface RenderedLayout {
	readonly descriptionLines: number;
	readonly layout: OgLayout['kind'];
	dispose(): void;
}

export async function renderLayout(
	layout: OgLayout,
	branding: ResolvedOgBranding,
	darken: number
): Promise<RenderedLayout> {
	clearLayout();
	mountDarkenLayer(darken);
	const overlay = layout.kind === 'gallery' ? mountGalleryOverlay(layout, branding) : mountMainOverlay(branding);
	let disposed = false;
	const dispose = (): void => {
		if (disposed) return;
		disposed = true;
		document.getElementById('og-overlay')?.remove();
		document.getElementById('og-darken')?.remove();
	};

	try {
		await document.fonts.ready;
		const descriptionLines = overlay.fit();
		await nextPaint();
		overlay.assert();
		return { descriptionLines, layout: layout.kind, dispose };
	} catch (error) {
		dispose();
		throw error;
	}
}

function clearLayout(): void {
	document.querySelectorAll('#og-overlay, #og-darken').forEach((element) => element.remove());
}

function mountDarkenLayer(darken: number): void {
	const opacity = Number.isFinite(darken) ? Math.min(1, Math.max(0, darken / 100)) : 0;
	const element = document.createElement('div');
	element.id = 'og-darken';
	element.style.background = `rgba(0, 0, 0, ${opacity})`;
	document.body.appendChild(element);
}

function nextPaint(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
