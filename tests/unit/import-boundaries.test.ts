import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../src');

describe('source environment boundaries', () => {
	it('keeps Node modules independent from preview implementations', async () => {
		const nodeFiles = ['node/generator.ts', 'node/preview-renderer.ts', 'node/preview-server.ts', 'node/source.ts'];
		const contents = await Promise.all(nodeFiles.map((file) => readFile(path.join(root, file), 'utf8')));
		expect(contents.join('\n')).not.toMatch(/from ['"].*\/preview\//);
	});

	it('keeps public shared contracts free of runtime-specific imports', async () => {
		const source = await readFile(path.join(root, 'shared/public-contracts.ts'), 'utf8');
		expect(source).not.toMatch(/node:|from ['"].*node\//);
	});
});
