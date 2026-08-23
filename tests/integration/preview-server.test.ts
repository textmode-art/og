import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startPreviewServer, resolveContainedPath } from '../../src/node/preview-server';
import { PREVIEW_BASE_PATH } from '../../src/shared/preview-paths';

const servers: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
	await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('preview asset serving', () => {
	it('keeps the lexical helper safe for ordinary traversal', () => {
		const root = path.resolve('/tmp/textmode-og-assets');
		expect(resolveContainedPath(root, 'images/example.png')).toBe(path.join(root, 'images', 'example.png'));
		expect(resolveContainedPath(root, '../secret.txt')).toBeNull();
		expect(resolveContainedPath(root, '/tmp/secret.txt')).toBeNull();
	});

	it('serves internal files and denies missing, traversal, and escaping symlink requests over HTTP', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-server-'));
		const outside = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-outside-'));
		await mkdir(path.join(directory, 'nested'));
		await writeFile(path.join(directory, 'index.html'), '<!doctype html>');
		await writeFile(path.join(directory, 'nested', 'inside.txt'), 'inside');
		await writeFile(path.join(outside, 'secret.txt'), 'secret');
		await symlink(path.join(outside, 'secret.txt'), path.join(directory, 'escape.txt'));

		const server = await startPreviewServer(directory);
		servers.push(server);
		const registration = server.registerAssetRoot(directory);

		const internal = await fetch(`${registration.url}nested/inside.txt`);
		expect(internal.status).toBe(200);
		expect(await internal.text()).toBe('inside');

		const preview = await fetch(`${server.origin}${PREVIEW_BASE_PATH}index.html`);
		expect(preview.status).toBe(200);
		expect(await preview.text()).toContain('<!doctype html>');

		expect((await fetch(`${registration.url}missing.txt`)).status).toBe(404);
		expect((await fetch(`${registration.url}%2e%2e%2Fsecret.txt`)).status).toBe(403);
		expect((await fetch(`${registration.url}escape.txt`)).status).toBe(403);

		registration.dispose();
		expect((await fetch(`${registration.url}nested/inside.txt`)).status).toBe(404);
	});
});
