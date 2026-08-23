import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import { PREVIEW_BASE_PATH, PREVIEW_JOB_PATH, previewJobPath } from '../shared/preview-paths.js';

const CONTENT_TYPES: Record<string, string> = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
};

export interface PreviewServer {
	readonly origin: string;
	registerAssetRoot(assetRoot?: string): { url: string; dispose(): void };
	close(): Promise<void>;
}

export async function startPreviewServer(previewRoot?: string): Promise<PreviewServer> {
	const resolvedPreviewRoot = await canonicalizeRoot(previewRoot ?? (await resolvePreviewRoot()));
	const indexHtml = await readFile(path.join(resolvedPreviewRoot, 'index.html'));
	const assetRoots = new Map<string, string | undefined>();
	const server: Server = createServer((request, response) => {
		void handleRequest(request.url ?? '/', response, resolvedPreviewRoot, indexHtml, assetRoots);
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === 'string') {
		await closeServer(server);
		throw new Error('Could not determine the local preview server port.');
	}
	const origin = `http://127.0.0.1:${address.port}`;
	let closed = false;

	return {
		origin,
		registerAssetRoot(assetRoot) {
			const token = randomUUID();
			assetRoots.set(token, assetRoot === undefined ? undefined : path.resolve(assetRoot));
			let disposed = false;
			return {
				url: `${origin}${previewJobPath(token)}`,
				dispose: () => {
					if (disposed) return;
					disposed = true;
					assetRoots.delete(token);
				},
			};
		},
		close: async () => {
			if (closed) return;
			closed = true;
			assetRoots.clear();
			await closeServer(server);
		},
	};
}

async function handleRequest(
	rawUrl: string,
	response: ServerResponse,
	previewRoot: string,
	indexHtml: Buffer,
	assetRoots: Map<string, string | undefined>
): Promise<void> {
	try {
		let pathname: string;
		try {
			pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
		} catch {
			respond(response, 400, 'Malformed request path.');
			return;
		}

		if (pathname.startsWith(PREVIEW_BASE_PATH)) {
			const relativePath = pathname.slice(PREVIEW_BASE_PATH.length) || 'index.html';
			await serveContainedFile(response, previewRoot, relativePath);
			return;
		}
		if (pathname.startsWith(PREVIEW_JOB_PATH)) {
			const segments = pathname.slice(PREVIEW_JOB_PATH.length).split('/');
			const token = segments.shift() ?? '';
			if (!assetRoots.has(token)) {
				respond(response, 404, 'Unknown render job.');
				return;
			}
			const relativePath = segments.join('/');
			if (!relativePath) {
				response.writeHead(200, {
					'Content-Type': 'text/html; charset=utf-8',
					'Cache-Control': 'no-store',
				});
				response.end(indexHtml);
				return;
			}
			const assetRoot = assetRoots.get(token);
			if (!assetRoot) {
				respond(response, 404, 'This sketch has no local asset root.');
				return;
			}
			await serveContainedFile(response, assetRoot, relativePath);
			return;
		}
		respond(response, 404, 'Not found.');
	} catch (error) {
		if (!response.headersSent) respond(response, 500, error instanceof Error ? error.message : String(error));
		else response.destroy(error instanceof Error ? error : undefined);
	}
}

async function serveContainedFile(response: ServerResponse, root: string, relativePath: string): Promise<void> {
	const result = await resolveCanonicalContainedPath(root, relativePath);
	if (result.kind !== 'ok') {
		respond(
			response,
			result.kind === 'denied' ? 403 : 404,
			result.kind === 'denied' ? 'Path escapes the allowed asset root.' : 'Not found.'
		);
		return;
	}

	let fileStats;
	try {
		fileStats = await stat(result.path);
	} catch {
		respond(response, 404, 'Not found.');
		return;
	}
	if (!fileStats.isFile()) {
		respond(response, 404, 'Not found.');
		return;
	}

	await new Promise<void>((resolve) => {
		const stream = createReadStream(result.path);
		let settled = false;
		const finish = (): void => {
			if (settled) return;
			settled = true;
			resolve();
		};
		stream.once('open', () => {
			if (response.headersSent) return;
			response.writeHead(200, {
				'Content-Type': CONTENT_TYPES[path.extname(result.path).toLowerCase()] ?? 'application/octet-stream',
				'Content-Length': fileStats.size,
				'Cache-Control': 'no-store',
			});
			stream.pipe(response);
		});
		stream.once('end', finish);
		stream.once('error', (error) => {
			if (!response.headersSent) respond(response, 500, `Could not read asset: ${error.message}`);
			else response.destroy(error);
			finish();
		});
	});
}

type ContainedPathResult = { readonly kind: 'ok'; readonly path: string } | { readonly kind: 'missing' | 'denied' };

async function resolveCanonicalContainedPath(root: string, relativePath: string): Promise<ContainedPathResult> {
	let canonicalRoot: string;
	try {
		canonicalRoot = await realpath(root);
	} catch {
		return { kind: 'missing' };
	}
	const lexicalPath = path.resolve(canonicalRoot, relativePath);
	if (!isContained(canonicalRoot, lexicalPath)) return { kind: 'denied' };
	let canonicalPath: string;
	try {
		canonicalPath = await realpath(lexicalPath);
	} catch {
		return { kind: 'missing' };
	}
	return isContained(canonicalRoot, canonicalPath) ? { kind: 'ok', path: canonicalPath } : { kind: 'denied' };
}

/** Lexical form retained as a small pure helper; HTTP serving additionally canonicalizes through realpath. */
export function resolveContainedPath(root: string, relativePath: string): string | null {
	const normalizedRoot = path.resolve(root);
	const filePath = path.resolve(normalizedRoot, relativePath);
	return isContained(normalizedRoot, filePath) ? filePath : null;
}

function isContained(root: string, candidate: string): boolean {
	return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function respond(response: ServerResponse, status: number, message: string): void {
	if (response.headersSent) {
		response.destroy();
		return;
	}
	response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
	response.end(message);
}

async function resolvePreviewRoot(): Promise<string> {
	const candidate = path.resolve(import.meta.dirname, '../../dist/preview');
	try {
		await access(path.join(candidate, 'index.html'));
		return candidate;
	} catch (error) {
		throw new Error(
			`Packaged OG preview is missing: ${candidate}. Run \`npm run build\` before generating images.`,
			{
				cause: error,
			}
		);
	}
}

async function canonicalizeRoot(root: string): Promise<string> {
	try {
		return await realpath(root);
	} catch (error) {
		throw new Error(`Preview root is missing or invalid: ${root}`, { cause: error });
	}
}

function closeServer(server: Server): Promise<void> {
	if (!server.listening) return Promise.resolve();
	return new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}
