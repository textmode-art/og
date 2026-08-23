import { describe, expect, it } from 'vitest';
import { isPreviewOutcome, isPreviewRenderRequest, PREVIEW_PROTOCOL_VERSION } from '../../src/shared/preview-protocol';

describe('preview protocol', () => {
	it('accepts the versioned success and request shapes', () => {
		const branding = { logoSvg: '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>', labels: { brandName: 'brand' } };
		const request = {
			protocolVersion: PREVIEW_PROTOCOL_VERSION,
			code: 't.draw(() => {});',
			frame: 1,
			darken: 0,
			layout: { kind: 'main' as const },
			branding,
		};
		expect(isPreviewRenderRequest(request)).toBe(true);
		expect(
			isPreviewOutcome({
				protocolVersion: PREVIEW_PROTOCOL_VERSION,
				ok: true,
				metadata: { frame: 1, seconds: 0, descriptionLines: 0, layout: 'main' },
			})
		).toBe(true);
	});

	it('rejects protocol mismatches and incomplete outcomes', () => {
		expect(isPreviewOutcome({ protocolVersion: 2, ok: true })).toBe(false);
		expect(isPreviewOutcome({ protocolVersion: PREVIEW_PROTOCOL_VERSION, ok: true, metadata: { frame: 1 } })).toBe(
			false
		);
		expect(
			isPreviewOutcome({ protocolVersion: PREVIEW_PROTOCOL_VERSION, ok: false, error: { code: 'SKETCH_FAILED' } })
		).toBe(false);
		expect(
			isPreviewRenderRequest({ protocolVersion: PREVIEW_PROTOCOL_VERSION, code: 'x', frame: 1, darken: 0 })
		).toBe(false);
	});
});
