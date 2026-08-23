import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OG_HEIGHT, OG_WIDTH } from '../shared/public-contracts.js';
import { OgGenerationError, asOgGenerationError } from './errors.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface OgPngMetadata {
	readonly width: number;
	readonly height: number;
}

export function assertOgPngBytes(value: Uint8Array): OgPngMetadata {
	const buffer = Buffer.from(value);
	if (
		buffer.length < 24 ||
		!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
		buffer.toString('ascii', 12, 16) !== 'IHDR'
	) {
		throw new OgGenerationError('OG image is not a valid PNG.', {
			code: 'INVALID_OUTPUT_IMAGE',
			stage: 'validate',
		});
	}
	const width = buffer.readUInt32BE(16);
	const height = buffer.readUInt32BE(20);
	if (width !== OG_WIDTH || height !== OG_HEIGHT) {
		throw new OgGenerationError(`OG image must be ${OG_WIDTH}x${OG_HEIGHT}, got ${width}x${height}.`, {
			code: 'INVALID_OUTPUT_IMAGE',
			stage: 'validate',
		});
	}
	return { width, height };
}

export async function commitOgPng(bytes: Uint8Array, outputPath: string): Promise<OgPngMetadata> {
	let metadata: OgPngMetadata;
	try {
		metadata = assertOgPngBytes(bytes);
	} catch (error) {
		throw asOgGenerationError(error, { code: 'INVALID_OUTPUT_IMAGE', stage: 'validate' });
	}

	const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${randomUUID()}.tmp.png`);
	try {
		await mkdir(path.dirname(outputPath), { recursive: true });
		await writeFile(temporaryPath, bytes, { flag: 'wx' });
		await rename(temporaryPath, outputPath);
		return metadata;
	} catch (error) {
		throw new OgGenerationError(`Could not commit OG image: ${outputPath}`, {
			code: 'OUTPUT_COMMIT_FAILED',
			stage: 'commit',
			cause: error,
		});
	} finally {
		await rm(temporaryPath, { force: true }).catch(() => undefined);
	}
}
