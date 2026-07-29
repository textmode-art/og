import LZString from 'lz-string';
import { describe, expect, it } from 'vitest';
import { decodeEditorShareUrl } from '../../src/node/source';

function shareUrl(payload: unknown, location = 'hash'): string {
	const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
	return location === 'hash'
		? `https://editor.textmode.art/#share=${encoded}`
		: `https://editor.textmode.art/?share=${encoded}`;
}

describe('editor share URL source', () => {
	it('decodes hash and legacy query payloads locally', () => {
		const payload = { v: 1, createdAt: 0, engines: { textmode: 't.draw(() => {});' } };
		expect(decodeEditorShareUrl(shareUrl(payload))).toBe('t.draw(() => {});');
		expect(decodeEditorShareUrl(shareUrl(payload, 'query'))).toBe('t.draw(() => {});');
	});

	it('rejects other origins and malformed or unsupported payloads', () => {
		expect(() => decodeEditorShareUrl('https://example.com/#share=x')).toThrow('https://editor.textmode.art');
		expect(() => decodeEditorShareUrl('https://editor.textmode.art/')).toThrow('does not contain');
		expect(() => decodeEditorShareUrl(shareUrl({ v: 2, engines: { textmode: 'x' } }))).toThrow('Unsupported');
		expect(() => decodeEditorShareUrl(shareUrl({ v: 1, engines: {} }))).toThrow(
			'does not contain a textmode sketch'
		);
	});

	it('rejects oversized decoded payloads', () => {
		expect(() => decodeEditorShareUrl(shareUrl({ v: 1, engines: { textmode: 'x'.repeat(300_001) } }))).toThrow(
			'exceeds 300000'
		);
	});
});
