export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function mountSvgLogo(parentId: string, logoSvg: string, size: number, y: number): void {
	const parent = document.getElementById(parentId);
	if (!parent) throw new Error(`OG logo parent is missing: ${parentId}`);
	const parsed = new DOMParser().parseFromString(logoSvg, 'image/svg+xml');
	if (parsed.querySelector('parsererror')) throw new Error('Branding logo SVG could not be parsed.');
	const source = parsed.documentElement;
	const viewBox = source.getAttribute('viewBox');
	if (source.localName !== 'svg' || !viewBox) {
		throw new Error('Branding logo must contain an SVG root with a viewBox.');
	}
	const logo = document.createElementNS(SVG_NAMESPACE, 'svg');
	logo.setAttribute('x', '0');
	logo.setAttribute('y', String(y));
	logo.setAttribute('width', String(size));
	logo.setAttribute('height', String(size));
	logo.setAttribute('viewBox', viewBox);
	logo.setAttribute('fill', '#f2f2ec');
	logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	logo.dataset.ogLogo = 'true';
	for (const child of Array.from(source.children)) {
		logo.appendChild(document.importNode(child, true));
	}
	parent.prepend(logo);
}

export function getFittedFontSize(
	measuredWidth: number,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): number {
	let fontSize = initialFontSize;
	while (measuredWidth * (fontSize / initialFontSize) > maxWidth && fontSize > minimumFontSize) {
		fontSize = Math.max(minimumFontSize, fontSize - 2);
	}
	return fontSize;
}

export function fitSvgText(
	text: SVGTextElement,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number
): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	while (text.getComputedTextLength() > maxWidth && (text.textContent?.length ?? 0) > 1) {
		text.textContent = `${text.textContent?.slice(0, -2)}…`;
	}
}

export function fitSvgTextStrict(
	text: SVGTextElement,
	maxWidth: number,
	initialFontSize: number,
	minimumFontSize: number,
	label: string
): void {
	const fontSize = getFittedFontSize(text.getComputedTextLength(), maxWidth, initialFontSize, minimumFontSize);
	text.setAttribute('font-size', String(fontSize));
	if (text.getComputedTextLength() > maxWidth) {
		throw new Error(`${label} cannot fit within the fixed OG layout.`);
	}
}

export function fitOpposingSvgText(
	left: SVGTextElement,
	right: SVGTextElement,
	availableWidth: number,
	minimumGap: number,
	leftExtraWidth = 0,
	minimumFontSize = 28
): void {
	while (
		leftExtraWidth + left.getComputedTextLength() + right.getComputedTextLength() + minimumGap >
		availableWidth
	) {
		const leftFontSize = Number(left.getAttribute('font-size'));
		const rightFontSize = Number(right.getAttribute('font-size'));
		const canShrinkLeft = leftFontSize > minimumFontSize;
		const canShrinkRight = rightFontSize > minimumFontSize;
		if (!canShrinkLeft && !canShrinkRight) {
			throw new Error('Opposing branding labels cannot fit within the fixed OG layout.');
		}
		const leftWidth = leftExtraWidth + left.getComputedTextLength();
		const rightWidth = right.getComputedTextLength();
		if (canShrinkLeft && (!canShrinkRight || leftWidth >= rightWidth)) {
			left.setAttribute('font-size', String(Math.max(minimumFontSize, leftFontSize - 2)));
		} else {
			right.setAttribute('font-size', String(Math.max(minimumFontSize, rightFontSize - 2)));
		}
	}
}

export function measureSvgText(text: SVGTextElement, value: string): number {
	text.textContent = value;
	return text.getComputedTextLength();
}

export function placeSvgTextBottom(text: SVGTextElement, bottom: number): number {
	const bounds = text.getBBox();
	const offsetY = bottom - (bounds.y + bounds.height);
	text.setAttribute('transform', `translate(0 ${offsetY})`);
	return bounds.y + offsetY;
}

export function getSvgText(id: string): SVGTextElement | null {
	const element = document.getElementById(id);
	return element instanceof SVGTextElement ? element : null;
}
