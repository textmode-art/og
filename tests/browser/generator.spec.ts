import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';
import { generateOgImages } from '../../src/node/index';

const fixtures = path.resolve(import.meta.dirname, '../fixtures');
const GPU_SNAPSHOT_TOLERANCE = { maxDiffPixelRatio: 0.06, threshold: 0.2 };
const MAIN_SNAPSHOT_TOLERANCE = { ...GPU_SNAPSHOT_TOLERANCE, threshold: 0.05 };

test('renders deterministic gallery and main layouts through the public interface', async ({}, testInfo) => {
	const codePath = path.join(fixtures, 'deterministic-sketch.js');
	const galleryOutput = testInfo.outputPath('gallery.png');
	const mainOutput = testInfo.outputPath('main.png');
	const firstFrameOutput = testInfo.outputPath('frame-1.png');
	const results = await generateOgImages({
		jobs: [
			{
				id: 'gallery',
				source: { kind: 'file', path: codePath },
				outputPath: galleryOutput,
				frame: 60,
				layout: {
					kind: 'gallery',
					title: 'Frame & Seek <Characterization>',
					description:
						'A deterministic capture fixture with enough descriptive detail to verify that the Open Graph metadata column wraps cleanly.',
					authorName: 'Test Runner',
				},
			},
			{
				id: 'main',
				source: { kind: 'file', path: codePath },
				outputPath: mainOutput,
				frame: 60,
				layout: { kind: 'main' },
			},
			{
				id: 'first-frame',
				source: { kind: 'file', path: codePath },
				outputPath: firstFrameOutput,
				frame: 1,
				layout: { kind: 'main' },
			},
		],
	});

	expect(results.map((result) => result.frame)).toEqual([60, 60, 1]);
	expect(results[0]?.seconds).toBeCloseTo(59 / 60, 3);
	expect(results[0]?.descriptionLines).toBeGreaterThanOrEqual(2);
	expect(results[1]?.layout).toBe('main');
	expect((await readFile(firstFrameOutput)).equals(await readFile(mainOutput))).toBe(false);
	expect(await readFile(galleryOutput)).toMatchSnapshot('gallery.png', GPU_SNAPSHOT_TOLERANCE);
	expect(await readFile(mainOutput)).toMatchSnapshot('main.png', MAIN_SNAPSHOT_TOLERANCE);
});

test('supports local assets, share URLs, inline code, and custom branding', async ({}, testInfo) => {
	const deterministicCode = await readFile(path.join(fixtures, 'deterministic-sketch.js'), 'utf8');
	const encoded = LZString.compressToEncodedURIComponent(
		JSON.stringify({ v: 1, createdAt: 0, engines: { textmode: deterministicCode } })
	);
	const logoPath = testInfo.outputPath('logo.svg');
	await writeFile(
		logoPath,
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'
	);
	const results = await generateOgImages({
		branding: {
			logoPath,
			labels: {
				brandName: 'custom.textmode.art',
				galleryBadge: 'FEATURED SKETCH',
				mainTopRight: 'OPEN CREATIVE TOOL',
			},
		},
		jobs: [
			{
				id: 'assets',
				source: { kind: 'file', path: path.join(fixtures, 'asset-sketch.js') },
				outputPath: testInfo.outputPath('assets.png'),
				frame: 1,
				layout: { kind: 'gallery', title: 'Local Asset' },
			},
			{
				id: 'share',
				source: {
					kind: 'editor-share-url',
					url: `https://editor.textmode.art/#share=${encoded}`,
				},
				outputPath: testInfo.outputPath('share.png'),
				frame: 1,
				layout: { kind: 'main' },
			},
			{
				id: 'code',
				source: { kind: 'code', code: deterministicCode },
				outputPath: testInfo.outputPath('code.png'),
				frame: 1,
				layout: { kind: 'gallery', title: 'Inline Code', authorName: null },
			},
		],
	});
	expect(results).toHaveLength(3);
	expect(results.every((result) => result.frame === 1)).toBe(true);

	await expect(
		generateOgImages({
			branding: { labels: { mainTopRight: 'UNFITTING LABEL '.repeat(100) } },
			jobs: [
				{
					id: 'unfitting-branding',
					source: { kind: 'code', code: deterministicCode },
					outputPath: testInfo.outputPath('unfitting.png'),
					frame: 1,
					layout: { kind: 'main' },
				},
			],
		})
	).rejects.toThrow(/branding labels cannot fit|cannot fit within the fixed OG layout/);
});

test('reports the failing stage and preserves the previous output', async ({}, testInfo) => {
	const outputPath = testInfo.outputPath('preserved.png');
	const before = Buffer.from('existing output');
	await writeFile(outputPath, before);

	await expect(
		generateOgImages({
			jobs: [
				{
					id: 'failing-sketch',
					source: { kind: 'file', path: path.join(fixtures, 'failing-sketch.js') },
					outputPath,
					frame: 60,
					layout: { kind: 'main' },
				},
			],
		})
	).rejects.toThrow(/failing-sketch.*during render.*expected OG fixture failure/);

	expect((await readFile(outputPath)).equals(before)).toBe(true);
	expect((await readdir(path.dirname(outputPath))).some((name) => name.endsWith('.tmp.png'))).toBe(false);
});
