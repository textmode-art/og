import { readFile } from 'node:fs/promises';
import path from 'node:path';
import LZString from 'lz-string';
import type { OgSketchSource } from '../shared/contracts.js';

const EDITOR_ORIGIN = 'https://editor.textmode.art';
const MAX_DECODED_SHARE_CHARS = 300_000;

export interface ResolvedSketchSource {
	code: string;
	assetRoot?: string;
	label: string;
}

export async function resolveSketchSource(source: OgSketchSource): Promise<ResolvedSketchSource> {
	switch (source.kind) {
		case 'file': {
			const filePath = path.resolve(source.path);
			try {
				return {
					code: await readFile(filePath, 'utf8'),
					assetRoot: path.dirname(filePath),
					label: filePath,
				};
			} catch (error) {
				throw new Error(`Could not read sketch file: ${filePath}`, { cause: error });
			}
		}
		case 'code':
			if (typeof source.code !== 'string' || source.code.trim().length === 0) {
				throw new Error('Code sketch source must contain non-empty JavaScript.');
			}
			return {
				code: source.code,
				assetRoot: source.assetRoot === undefined ? undefined : path.resolve(source.assetRoot),
				label: 'inline code',
			};
		case 'editor-share-url':
			return {
				code: decodeEditorShareUrl(source.url),
				label: source.url,
			};
	}
}

export function decodeEditorShareUrl(rawUrl: string): string {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch (error) {
		throw new Error('Editor share source must be a valid URL.', { cause: error });
	}
	if (url.origin !== EDITOR_ORIGIN) {
		throw new Error(`Editor share URL must use ${EDITOR_ORIGIN}.`);
	}

	const hashValue = new URLSearchParams(url.hash.replace(/^#/, '')).get('share');
	const queryValue = url.searchParams.get('share');
	const encoded = hashValue ?? queryValue;
	if (!encoded) throw new Error('Editor share URL does not contain a share payload.');

	let decoded: string | null;
	try {
		decoded = LZString.decompressFromEncodedURIComponent(encoded);
	} catch (error) {
		throw new Error('Editor share URL contains an invalid compressed payload.', { cause: error });
	}
	if (!decoded) throw new Error('Editor share URL contains an invalid compressed payload.');
	if (decoded.length > MAX_DECODED_SHARE_CHARS) {
		throw new Error(`Editor share payload exceeds ${MAX_DECODED_SHARE_CHARS} decoded characters.`);
	}

	let payload: unknown;
	try {
		payload = JSON.parse(decoded) as unknown;
	} catch (error) {
		throw new Error('Editor share URL contains invalid JSON.', { cause: error });
	}
	if (!payload || typeof payload !== 'object') throw new Error('Editor share payload must be an object.');
	const candidate = payload as { v?: unknown; engines?: { textmode?: unknown } };
	if (candidate.v !== 1) throw new Error(`Unsupported editor share payload version: ${String(candidate.v)}.`);
	const code = candidate.engines?.textmode;
	if (typeof code !== 'string' || code.trim().length === 0) {
		throw new Error('Editor share payload does not contain a textmode sketch.');
	}
	return code;
}
