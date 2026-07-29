import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveContainedPath } from '../../src/node/preview-server';

describe('preview asset containment', () => {
	it('allows files inside the configured root', () => {
		const root = path.resolve('/tmp/textmode-og-assets');
		expect(resolveContainedPath(root, 'images/example.png')).toBe(path.join(root, 'images', 'example.png'));
	});

	it('rejects paths outside the configured root', () => {
		const root = path.resolve('/tmp/textmode-og-assets');
		expect(resolveContainedPath(root, '../secret.txt')).toBeNull();
		expect(resolveContainedPath(root, '/tmp/secret.txt')).toBeNull();
	});
});
