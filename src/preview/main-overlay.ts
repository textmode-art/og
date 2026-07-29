import { escapeMarkup, OG_HEIGHT, OG_WIDTH, type ResolvedOgBranding } from '../shared/contracts';
import { SVG_NAMESPACE, fitOpposingSvgText, getFittedFontSize, getSvgText, mountSvgLogo } from './svg-text';

const SAFE_INSET = 48;
const VERTICAL_SAFE_INSET = 30;
const HOOK_MAX_WIDTH = OG_WIDTH - SAFE_INSET * 2;
const PRIMARY_FONT_SIZE = 158;
const SECONDARY_FONT_SIZE = 150;
const BRAND_FONT_SIZE = 52;
const BRAND_MARK_SIZE = 32;
const BRAND_MARK_Y_OFFSET = -9;
const BRAND_TEXT_OFFSET = 48;
const CORNER_LABEL_FONT_SIZE = 44;
const MIN_CORNER_LABEL_GAP = 64;

export interface MountedMainOverlay {
	fit(): number;
	assert(): void;
}

const WAVE_OFFSETS = [8, -2, -9, -4, 7, 13, 5, -4];

export function mountMainOverlay(branding: ResolvedOgBranding): MountedMainOverlay {
	const labels = branding.labels;
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.id = 'og-overlay';
	svg.dataset.layout = 'main';
	svg.setAttribute('width', String(OG_WIDTH));
	svg.setAttribute('height', String(OG_HEIGHT));
	svg.setAttribute('viewBox', `0 0 ${OG_WIDTH} ${OG_HEIGHT}`);
	svg.innerHTML = `
		<g id="site-og-brand" transform="translate(${SAFE_INSET} 47)">
			<text id="site-og-brand-text" x="${BRAND_TEXT_OFFSET}" y="20" fill="#f2f2ec" font-family="Monogram Extended" font-size="${BRAND_FONT_SIZE}">${escapeMarkup(labels.brandName)}</text>
		</g>
		<text id="site-og-top-right" x="${OG_WIDTH - SAFE_INSET}" y="66" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">${escapeMarkup(labels.mainTopRight)}</text>
		<g id="site-og-hook" fill="#f2f2ec" font-family="Monogram Extended" text-anchor="start">
			<text id="site-og-hook-primary" x="${SAFE_INSET}" y="295" font-size="${PRIMARY_FONT_SIZE}" letter-spacing="2" xml:space="preserve">${escapeMarkup(labels.mainHeadlinePrefix)} </text><g id="site-og-hook-wave"><text font-size="${PRIMARY_FONT_SIZE}" font-style="italic">${escapeMarkup(labels.mainHeadlineEmphasis)}</text></g>
			<text id="site-og-hook-secondary" x="${SAFE_INSET}" y="420" font-size="${SECONDARY_FONT_SIZE}" letter-spacing="2">${escapeMarkup(labels.mainHeadlineSecondLine)}</text>
		</g>
		<text id="site-og-bottom-left" x="${SAFE_INSET}" y="594" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" letter-spacing="1">${escapeMarkup(labels.mainBottomLeft)}</text>
		<text id="site-og-bottom-right" x="${OG_WIDTH - SAFE_INSET}" y="594" fill="#d8d8d2" font-family="Monogram Extended" font-size="${CORNER_LABEL_FONT_SIZE}" text-anchor="end" letter-spacing="1">${escapeMarkup(labels.mainBottomRight)}</text>
	`;
	document.body.appendChild(svg);
	mountSvgLogo('site-og-brand', branding.logoSvg, BRAND_MARK_SIZE, BRAND_MARK_Y_OFFSET);

	return {
		fit: () => fitMainMetadata(labels.mainHeadlineEmphasis),
		assert: () => assertMainMetadataLayout(branding),
	};
}

function fitMainMetadata(waveWord: string): number {
	const createText = getSvgText('site-og-hook-primary');
	const secondaryText = getSvgText('site-og-hook-secondary');
	const waveGroup = document.getElementById('site-og-hook-wave');
	if (!createText || !secondaryText || !waveGroup) return 0;
	fitMainLabels();

	createText.setAttribute('font-size', String(PRIMARY_FONT_SIZE));
	secondaryText.setAttribute('font-size', String(SECONDARY_FONT_SIZE));

	const stepAtInitialSize = 70;
	const createWidth = createText.getComputedTextLength();
	const waveWidth = waveWord.length * stepAtInitialSize;
	const totalPrimaryWidth = createWidth + waveWidth;

	const fontSize = getFittedFontSize(totalPrimaryWidth, HOOK_MAX_WIDTH, PRIMARY_FONT_SIZE, 112);
	const secondaryFontSize = getFittedFontSize(
		secondaryText.getComputedTextLength(),
		HOOK_MAX_WIDTH,
		SECONDARY_FONT_SIZE,
		112
	);

	createText.setAttribute('font-size', String(fontSize));
	secondaryText.setAttribute('font-size', String(secondaryFontSize));
	if (totalPrimaryWidth * (fontSize / PRIMARY_FONT_SIZE) > HOOK_MAX_WIDTH) {
		throw new Error('Main headline cannot fit within the fixed OG layout.');
	}
	if (secondaryText.getComputedTextLength() > HOOK_MAX_WIDTH) {
		throw new Error('Main second headline cannot fit within the fixed OG layout.');
	}

	const fittedCreateWidth = createText.getComputedTextLength();
	const scale = fontSize / PRIMARY_FONT_SIZE;
	const step = stepAtInitialSize * scale;
	const startX = SAFE_INSET + fittedCreateWidth;
	const baseline = 295;

	waveGroup.replaceChildren(
		...Array.from(waveWord).map((glyph, index) => {
			const text = document.createElementNS(SVG_NAMESPACE, 'text');
			text.setAttribute('x', String(startX + index * step));
			text.setAttribute('y', String(baseline + WAVE_OFFSETS[index % WAVE_OFFSETS.length] * scale));
			text.setAttribute('fill', '#f2f2ec');
			text.setAttribute('font-family', 'Monogram Extended');
			text.setAttribute('font-size', String(fontSize));
			text.setAttribute('font-style', 'italic');
			text.textContent = glyph;
			return text;
		})
	);

	return 0;
}

function fitMainLabels(): void {
	const brand = getSvgText('site-og-brand-text');
	const topRight = getSvgText('site-og-top-right');
	const bottomLeft = getSvgText('site-og-bottom-left');
	const bottomRight = getSvgText('site-og-bottom-right');
	if (!brand || !topRight || !bottomLeft || !bottomRight) return;
	brand.setAttribute('font-size', String(BRAND_FONT_SIZE));
	topRight.setAttribute('font-size', String(CORNER_LABEL_FONT_SIZE));
	bottomLeft.setAttribute('font-size', String(CORNER_LABEL_FONT_SIZE));
	bottomRight.setAttribute('font-size', String(CORNER_LABEL_FONT_SIZE));
	fitOpposingSvgText(brand, topRight, HOOK_MAX_WIDTH, MIN_CORNER_LABEL_GAP, BRAND_TEXT_OFFSET);
	fitOpposingSvgText(bottomLeft, bottomRight, HOOK_MAX_WIDTH, MIN_CORNER_LABEL_GAP);
}

function assertMainMetadataLayout(branding: ResolvedOgBranding): void {
	const brand = document.getElementById('site-og-brand');
	const topRight = getSvgText('site-og-top-right');
	const hook = document.getElementById('site-og-hook');
	const bottomLeft = getSvgText('site-og-bottom-left');
	const bottomRight = getSvgText('site-og-bottom-right');
	if (!brand || !topRight || !hook || !bottomLeft || !bottomRight) {
		throw new Error('Main OG metadata overlay is incomplete.');
	}

	const overlay = document.getElementById('og-overlay');
	const overlayText = overlay?.textContent ?? '';
	for (const expected of [
		branding.labels.brandName,
		branding.labels.mainHeadlinePrefix,
		branding.labels.mainHeadlineEmphasis,
		branding.labels.mainHeadlineSecondLine,
		branding.labels.mainTopRight,
		branding.labels.mainBottomLeft,
		branding.labels.mainBottomRight,
	]) {
		if (!overlayText.includes(expected)) {
			throw new Error(`Main OG metadata overlay is missing expected label "${expected}".`);
		}
	}
	const backdropOrEffects = Array.from(
		overlay?.querySelectorAll('#site-og-backdrop, rect, linearGradient, radialGradient, filter') ?? []
	).filter((element) => !element.closest('[data-og-logo="true"]'));
	if (backdropOrEffects.length !== 0) {
		throw new Error('Main OG overlay must contain no backdrop and no effects.');
	}

	const elements = [
		['brand', brand],
		['top-right label', topRight],
		['hook', hook],
		['bottom-left label', bottomLeft],
		['bottom-right label', bottomRight],
	] as const;
	const tolerance = 1;

	for (const [label, element] of elements) {
		const bounds = element.getBoundingClientRect();
		if (
			bounds.left < SAFE_INSET - tolerance ||
			bounds.right > OG_WIDTH - SAFE_INSET + tolerance ||
			bounds.top < VERTICAL_SAFE_INSET - tolerance ||
			bounds.bottom > OG_HEIGHT - VERTICAL_SAFE_INSET + tolerance
		) {
			throw new Error(
				`Main OG ${label} escaped its safe area (${Math.round(bounds.left)},${Math.round(bounds.top)} ${Math.round(bounds.width)}x${Math.round(bounds.height)}).`
			);
		}
	}

	const brandBounds = brand.getBoundingClientRect();
	const topRightBounds = topRight.getBoundingClientRect();
	const bottomLeftBounds = bottomLeft.getBoundingClientRect();
	const bottomRightBounds = bottomRight.getBoundingClientRect();
	if (
		brandBounds.right + MIN_CORNER_LABEL_GAP > topRightBounds.left + tolerance ||
		bottomLeftBounds.right + MIN_CORNER_LABEL_GAP > bottomRightBounds.left + tolerance
	) {
		throw new Error('Main OG opposing corner labels do not have enough horizontal separation.');
	}

	const topBottom = Math.max(brandBounds.bottom, topRightBounds.bottom);
	const hookBounds = hook.getBoundingClientRect();
	const bottomTop = Math.min(bottomLeftBounds.top, bottomRightBounds.top);
	if (hookBounds.top < topBottom + 48 - tolerance || hookBounds.bottom > bottomTop - 48 + tolerance) {
		throw new Error('Main OG hook overlaps its corner labels.');
	}
}
