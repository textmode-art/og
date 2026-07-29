import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertOgPng } from '../../src/node/image';

function pngHeader(width: number, height: number): Buffer {
	const buffer = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
	buffer.write('IHDR', 12, 'ascii');
	buffer.writeUInt32BE(width, 16);
	buffer.writeUInt32BE(height, 20);
	return buffer;
}

describe('OG PNG validation', () => {
	it('accepts a 1200x630 PNG header', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-image-'));
		const filePath = path.join(directory, 'og.png');
		await writeFile(filePath, pngHeader(1200, 630));
		await expect(assertOgPng(filePath)).resolves.toEqual({ width: 1200, height: 630 });
	});

	it('rejects invalid data and dimensions', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-image-'));
		const filePath = path.join(directory, 'og.png');
		await writeFile(filePath, Buffer.from('not a png'));
		await expect(assertOgPng(filePath)).rejects.toThrow('not a valid PNG');
		await writeFile(filePath, pngHeader(600, 315));
		await expect(assertOgPng(filePath)).rejects.toThrow('must be 1200x630');
	});
});
