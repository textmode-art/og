import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_OG_LABELS, assertSvgLogo, readBrandingConfig, resolveBranding } from '../../src/node/branding';

describe('OG branding', () => {
	it('deep-merges labels with editor defaults', async () => {
		const branding = await resolveBranding({ labels: { brandName: 'example.art' } });
		expect(branding.labels).toEqual({ ...DEFAULT_OG_LABELS, brandName: 'example.art' });
		expect(branding.logoSvg).toContain('viewBox="0 0 768 768"');
	});

	it('resolves a JSON logo relative to the config file', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-branding-'));
		await writeFile(
			path.join(directory, 'logo.svg'),
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>'
		);
		await writeFile(
			path.join(directory, 'branding.json'),
			JSON.stringify({ logoPath: './logo.svg', labels: { galleryBadge: 'FEATURED' } })
		);
		const config = await readBrandingConfig(path.join(directory, 'branding.json'));
		expect(config.logoPath).toBe(path.join(directory, 'logo.svg'));
		expect((await resolveBranding(config)).labels.galleryBadge).toBe('FEATURED');
	});

	it('rejects invalid labels and SVGs', async () => {
		await expect(resolveBranding({ labels: { brandName: ' ' } })).rejects.toThrow('non-empty');
		expect(() => assertSvgLogo('<svg><path d="M0 0"/></svg>')).toThrow('viewBox');
		expect(() => assertSvgLogo('<svg viewBox="0 0 1 1"></svg>')).toThrow('drawable');
	});
});
