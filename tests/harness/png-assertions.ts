import { inflateSync } from 'node:zlib';

// Separate Chromium contexts can differ at anti-aliased glyph edges; keep this tighter than the full-frame baselines.
export function expectPngsVisuallyEquivalent(
	first: Buffer,
	second: Buffer,
	maxDiffPixelRatio = 0.01,
	maxChannelDelta = 4
): void {
	const left = decodePng(first);
	const right = decodePng(second);
	if (left.width !== right.width || left.height !== right.height) {
		throw new Error(`PNG dimensions differ: ${left.width}x${left.height} vs ${right.width}x${right.height}.`);
	}
	let differentPixels = 0;
	for (let index = 0; index < left.pixels.length; index += 4) {
		const different = [0, 1, 2, 3].some(
			(channel) => Math.abs(left.pixels[index + channel]! - right.pixels[index + channel]!) > maxChannelDelta
		);
		if (different) differentPixels += 1;
	}
	const ratio = differentPixels / (left.width * left.height);
	if (ratio > maxDiffPixelRatio) throw new Error(`PNG pixel difference ${ratio} exceeded ${maxDiffPixelRatio}.`);
}

function decodePng(buffer: Buffer): { width: number; height: number; pixels: Uint8Array } {
	let offset = 8;
	let width = 0;
	let height = 0;
	let bytesPerPixel = 0;
	const compressed: Buffer[] = [];
	while (offset < buffer.length) {
		const size = buffer.readUInt32BE(offset);
		const type = buffer.toString('ascii', offset + 4, offset + 8);
		const data = buffer.subarray(offset + 8, offset + 8 + size);
		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (data[8] !== 8 || (data[9] !== 6 && data[9] !== 2))
				throw new Error('Test PNG decoder only supports 8-bit RGB/RGBA PNGs.');
			bytesPerPixel = data[9] === 6 ? 4 : 3;
		}
		if (type === 'IDAT') compressed.push(data);
		offset += 12 + size;
		if (type === 'IEND') break;
	}
	const rowBytes = width * bytesPerPixel;
	const inflated = inflateSync(Buffer.concat(compressed));
	const raw = new Uint8Array(width * height * 4);
	const previous = new Uint8Array(rowBytes);
	let sourceOffset = 0;
	for (let y = 0; y < height; y += 1) {
		const filter = inflated[sourceOffset++];
		const row = new Uint8Array(inflated.subarray(sourceOffset, sourceOffset + rowBytes));
		sourceOffset += rowBytes;
		unfilter(row, previous, filter, bytesPerPixel);
		for (let x = 0; x < width; x += 1) {
			const source = x * bytesPerPixel;
			const destination = (y * width + x) * 4;
			raw[destination] = row[source]!;
			raw[destination + 1] = row[source + 1]!;
			raw[destination + 2] = row[source + 2]!;
			raw[destination + 3] = bytesPerPixel === 4 ? row[source + 3]! : 255;
		}
		previous.set(row);
	}
	return { width, height, pixels: raw };
}

function unfilter(row: Uint8Array, previous: Uint8Array, filter: number | undefined, bytesPerPixel: number): void {
	if (filter === 0) return;
	for (let index = 0; index < row.length; index += 1) {
		const left = index >= bytesPerPixel ? row[index - bytesPerPixel]! : 0;
		const up = previous[index] ?? 0;
		const upperLeft = index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;
		if (filter === 1) row[index] = (row[index]! + left) & 255;
		else if (filter === 2) row[index] = (row[index]! + up) & 255;
		else if (filter === 3) row[index] = (row[index]! + Math.floor((left + up) / 2)) & 255;
		else if (filter === 4) row[index] = (row[index]! + paeth(left, up, upperLeft)) & 255;
		else throw new Error(`Unsupported PNG filter: ${filter}.`);
	}
}

function paeth(left: number, up: number, upperLeft: number): number {
	const estimate = left + up - upperLeft;
	const leftDistance = Math.abs(estimate - left);
	const upDistance = Math.abs(estimate - up);
	const upperLeftDistance = Math.abs(estimate - upperLeft);
	return leftDistance <= upDistance && leftDistance <= upperLeftDistance
		? left
		: upDistance <= upperLeftDistance
			? up
			: upperLeft;
}
