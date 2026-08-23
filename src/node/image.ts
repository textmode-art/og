import { readFile } from 'node:fs/promises';
import { assertOgPngBytes } from './png-output.js';
import { OgGenerationError } from './errors.js';

export async function assertOgPng(filePath: string): Promise<{ width: number; height: number }> {
	let buffer: Buffer;
	try {
		buffer = await readFile(filePath);
	} catch (error) {
		throw new OgGenerationError(`Missing OG image: ${filePath}`, {
			code: 'INVALID_OUTPUT_IMAGE',
			stage: 'validate',
			cause: error,
		});
	}
	try {
		return assertOgPngBytes(buffer);
	} catch (error) {
		throw new OgGenerationError(`${error instanceof Error ? error.message : String(error)}: ${filePath}`, {
			code: 'INVALID_OUTPUT_IMAGE',
			stage: 'validate',
			cause: error,
		});
	}
}
