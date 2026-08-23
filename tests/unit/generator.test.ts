import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateOgImages, generateOgImagesWithRenderer } from '../../src/node/generator';
import { OgGenerationError } from '../../src/node/errors';
import { TestPreviewRenderer } from '../../src/node/test-preview-renderer';
import { chromiumLaunchArguments } from '../../src/node/preview-renderer';

describe('generateOgImages contract', () => {
	it('returns immediately for an empty batch', async () => {
		await expect(generateOgImages({ jobs: [] })).resolves.toEqual([]);
	});

	it('validates jobs before starting a browser session', async () => {
		let rendererCreated = false;
		const rendererFactory = () => {
			rendererCreated = true;
			return new TestPreviewRenderer();
		};
		await expect(
			generateOgImagesWithRenderer(
				{
					jobs: [
						{
							source: { kind: 'code', code: 't.draw(() => {});' },
							outputPath: 'og.png',
							layout: { kind: 'gallery', title: '' },
						},
					],
				},
				rendererFactory
			)
		).rejects.toThrow('non-empty title');
		expect(rendererCreated).toBe(false);
		await expect(
			generateOgImagesWithRenderer(
				{
					jobs: [
						{
							source: { kind: 'code', code: 't.draw(() => {});' },
							outputPath: 'og.png',
							layout: { kind: 'main' },
							frame: 1001,
						},
					],
				},
				rendererFactory
			)
		).rejects.toThrow('1 to 1000');
	});

	it('rejects duplicate normalized destinations before renderer creation', async () => {
		let rendererCreated = false;
		await expect(
			generateOgImagesWithRenderer(
				{
					jobs: [
						{ source: { kind: 'code', code: 'x' }, outputPath: './same.png', layout: { kind: 'main' } },
						{ source: { kind: 'code', code: 'y' }, outputPath: 'same.png', layout: { kind: 'main' } },
					],
				},
				() => {
					rendererCreated = true;
					return new TestPreviewRenderer();
				}
			)
		).rejects.toMatchObject({ code: 'INVALID_REQUEST', stage: 'plan' });
		expect(rendererCreated).toBe(false);
	});

	it('keeps Chromium sandboxed by default and makes the exception explicit', () => {
		expect(chromiumLaunchArguments()).not.toContain('--no-sandbox');
		expect(chromiumLaunchArguments(true)).toContain('--no-sandbox');
	});

	it('commits prior jobs and fails fast when a later job fails', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-generator-'));
		const renderer = new TestPreviewRenderer({
			render: (input) => {
				if (input.jobId === 'third')
					throw new OgGenerationError('fixture failure', { code: 'SKETCH_FAILED', stage: 'render' });
				return {
					bytes: validPng(),
					metadata: { frame: input.frame, seconds: 0, descriptionLines: 0, layout: input.layout.kind },
				};
			},
		});
		await expect(
			generateOgImagesWithRenderer(
				{
					jobs: ['first', 'second', 'third'].map((id) => ({
						id,
						source: { kind: 'code', code: 'x' },
						outputPath: path.join(directory, `${id}.png`),
						layout: { kind: 'main' as const },
					})),
				},
				() => renderer
			)
		).rejects.toMatchObject({ code: 'SKETCH_FAILED', jobId: 'third', stage: 'render' });
		await expect(readFile(path.join(directory, 'first.png'))).resolves.toBeInstanceOf(Buffer);
		await expect(readFile(path.join(directory, 'second.png'))).resolves.toBeInstanceOf(Buffer);
	});

	it('preserves an existing destination when rendering fails', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-generator-'));
		const outputPath = path.join(directory, 'existing.png');
		const before = Buffer.from('existing');
		await writeFile(outputPath, before);
		const renderer = new TestPreviewRenderer({
			render: () => {
				throw new Error('render failed');
			},
		});
		await expect(
			generateOgImagesWithRenderer(
				{
					jobs: [
						{ id: 'failure', source: { kind: 'code', code: 'x' }, outputPath, layout: { kind: 'main' } },
					],
				},
				() => renderer
			)
		).rejects.toMatchObject({ code: 'SKETCH_FAILED', stage: 'render' });
		expect(await readFile(outputPath)).toEqual(before);
		expect(renderer.closeCount).toBe(1);
	});

	it('keeps cleanup failures secondary to the render failure', async () => {
		const renderer = new TestPreviewRenderer({
			render: () => {
				throw new OgGenerationError('render failed', { code: 'SKETCH_FAILED', stage: 'render' });
			},
			close: () => {
				throw new Error('close failed');
			},
		});
		const error = await generateOgImagesWithRenderer(
			{
				jobs: [
					{
						id: 'cleanup',
						source: { kind: 'code', code: 'x' },
						outputPath: 'cleanup.png',
						layout: { kind: 'main' },
					},
				],
			},
			() => renderer
		).catch((value: unknown) => value);
		expect(error).toMatchObject({ code: 'SKETCH_FAILED', stage: 'render', jobId: 'cleanup' });
		expect(error).toHaveProperty('cleanupDiagnostics');
		expect((error as OgGenerationError).cleanupDiagnostics.length).toBeGreaterThan(0);
	});
});

function validPng(): Uint8Array {
	const buffer = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
	buffer.write('IHDR', 12, 'ascii');
	buffer.writeUInt32BE(1200, 16);
	buffer.writeUInt32BE(630, 20);
	return buffer;
}
