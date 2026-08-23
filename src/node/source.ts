import { readFile } from 'node:fs/promises';
import path from 'node:path';
import LZString from 'lz-string';
import type { OgSketchSource } from '../shared/public-contracts.js';
import { OgGenerationError } from './errors.js';

const EDITOR_ORIGIN = 'https://editor.textmode.art';
const MAX_DECODED_SHARE_CHARS = 300_000;

export interface ResolvedSketchSource {
	readonly code: string;
	readonly assetRoot?: string;
	readonly label: string;
}

export async function resolveSketchSource(source: OgSketchSource): Promise<ResolvedSketchSource> {
	if (!source || typeof source !== 'object' || typeof source.kind !== 'string') {
		throw invalidSource('Sketch source must be a valid object.');
	}
	switch (source.kind) {
		case 'file': {
			const filePath = path.resolve(source.path);
			try {
				return { code: await readFile(filePath, 'utf8'), assetRoot: path.dirname(filePath), label: filePath };
			} catch (error) {
				throw new OgGenerationError(`Could not read sketch file: ${filePath}`, {
					code: 'SOURCE_READ_FAILED',
					stage: 'source',
					cause: error,
				});
			}
		}
		case 'code':
			if (typeof source.code !== 'string' || source.code.trim().length === 0) {
				throw invalidSource('Code sketch source must contain non-empty JavaScript.');
			}
			return {
				code: source.code,
				assetRoot: source.assetRoot === undefined ? undefined : path.resolve(source.assetRoot),
				label: 'inline code',
			};
		case 'editor-share-url':
			return { code: decodeEditorShareUrl(source.url), label: source.url };
		default:
			throw invalidSource(`Unsupported sketch source kind: ${(source as { kind: string }).kind}.`);
	}
}

export function decodeEditorShareUrl(rawUrl: string): string {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch (error) {
		throw invalidSource('Editor share source must be a valid URL.', error);
	}
	if (url.origin !== EDITOR_ORIGIN) throw invalidSource(`Editor share URL must use ${EDITOR_ORIGIN}.`);

	const hashValue = new URLSearchParams(url.hash.replace(/^#/, '')).get('share');
	const queryValue = url.searchParams.get('share');
	const encoded = hashValue ?? queryValue;
	if (!encoded) throw invalidSource('Editor share URL does not contain a share payload.');

	let decoded: string | null;
	try {
		decoded = LZString.decompressFromEncodedURIComponent(encoded);
	} catch (error) {
		throw invalidSource('Editor share URL contains an invalid compressed payload.', error);
	}
	if (!decoded) throw invalidSource('Editor share URL contains an invalid compressed payload.');
	if (decoded.length > MAX_DECODED_SHARE_CHARS) {
		throw invalidSource(`Editor share payload exceeds ${MAX_DECODED_SHARE_CHARS} decoded characters.`);
	}

	let payload: unknown;
	try {
		payload = JSON.parse(decoded) as unknown;
	} catch (error) {
		throw invalidSource('Editor share URL contains invalid JSON.', error);
	}
	if (!payload || typeof payload !== 'object') throw invalidSource('Editor share payload must be an object.');
	const candidate = payload as { v?: unknown; engines?: { textmode?: unknown } };
	if (candidate.v !== 1) throw invalidSource(`Unsupported editor share payload version: ${String(candidate.v)}.`);
	const code = candidate.engines?.textmode;
	if (typeof code !== 'string' || code.trim().length === 0) {
		throw invalidSource('Editor share payload does not contain a textmode sketch.');
	}
	return code;
}

function invalidSource(message: string, cause?: unknown): OgGenerationError {
	return new OgGenerationError(message, { code: 'INVALID_SOURCE', stage: 'source', cause });
}
