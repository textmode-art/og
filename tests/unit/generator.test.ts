import { describe, expect, it } from 'vitest';
import { generateOgImages } from '../../src/node/generator';

describe('generateOgImages contract', () => {
	it('returns immediately for an empty batch', async () => {
		await expect(generateOgImages({ jobs: [] })).resolves.toEqual([]);
	});

	it('validates jobs before starting a browser session', async () => {
		await expect(
			generateOgImages({
				jobs: [
					{
						source: { kind: 'code', code: 't.draw(() => {});' },
						outputPath: 'og.png',
						layout: { kind: 'gallery', title: '' },
					},
				],
			})
		).rejects.toThrow('non-empty title');
		await expect(
			generateOgImages({
				jobs: [
					{
						source: { kind: 'code', code: 't.draw(() => {});' },
						outputPath: 'og.png',
						layout: { kind: 'main' },
						frame: 1001,
					},
				],
			})
		).rejects.toThrow('1 to 1000');
	});
});
