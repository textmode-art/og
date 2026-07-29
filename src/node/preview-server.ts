import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

const PACKAGE_PREFIX = '/__textmode-og/';
const JOB_PREFIX = '/jobs/';

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
	origin: string;
	registerAssetRoot(assetRoot?: string): { url: string; dispose(): void };
	close(): Promise<void>;
}

export async function startPreviewServer(previewRoot?: string): Promise<PreviewServer> {
	previewRoot ??= await resolvePreviewRoot();
	const indexHtml = await readFile(path.join(previewRoot, 'index.html'));
	const assetRoots = new Map<string, string | undefined>();
	const server: Server = createServer((request, response) => {
		void handleRequest(request.url ?? '/', response, previewRoot, indexHtml, assetRoots);
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

	return {
		origin,
		registerAssetRoot(assetRoot) {
			const token = randomUUID();
			assetRoots.set(token, assetRoot === undefined ? undefined : path.resolve(assetRoot));
			return {
				url: `${origin}${JOB_PREFIX}${token}/`,
				dispose: () => assetRoots.delete(token),
			};
		},
		close: () => closeServer(server),
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
		const pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
		if (pathname.startsWith(PACKAGE_PREFIX)) {
			const relativePath = pathname.slice(PACKAGE_PREFIX.length) || 'index.html';
			await serveContainedFile(response, previewRoot, relativePath);
			return;
		}
		if (pathname.startsWith(JOB_PREFIX)) {
			const segments = pathname.slice(JOB_PREFIX.length).split('/');
			const token = segments.shift() ?? '';
			if (!assetRoots.has(token)) return respond(response, 404, 'Unknown render job.');
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
			if (!assetRoot) return respond(response, 404, 'This sketch has no local asset root.');
			await serveContainedFile(response, assetRoot, relativePath);
			return;
		}
		respond(response, 404, 'Not found.');
	} catch (error) {
		respond(response, 500, error instanceof Error ? error.message : String(error));
	}
}

async function serveContainedFile(response: ServerResponse, root: string, relativePath: string): Promise<void> {
	const filePath = resolveContainedPath(root, relativePath);
	if (!filePath) {
		respond(response, 403, 'Path escapes the allowed asset root.');
		return;
	}
	let fileStats;
	try {
		fileStats = await stat(filePath);
	} catch {
		respond(response, 404, 'Not found.');
		return;
	}
	if (!fileStats.isFile()) {
		respond(response, 404, 'Not found.');
		return;
	}
	response.writeHead(200, {
		'Content-Type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
		'Content-Length': fileStats.size,
		'Cache-Control': 'no-store',
	});
	createReadStream(filePath).pipe(response);
}

export function resolveContainedPath(root: string, relativePath: string): string | null {
	const normalizedRoot = path.resolve(root);
	const filePath = path.resolve(normalizedRoot, relativePath);
	return filePath === normalizedRoot || filePath.startsWith(`${normalizedRoot}${path.sep}`) ? filePath : null;
}

function respond(response: ServerResponse, status: number, message: string): void {
	response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
	response.end(message);
}

async function resolvePreviewRoot(): Promise<string> {
	const candidates = [
		path.resolve(import.meta.dirname, '../../dist/preview'),
		path.resolve(import.meta.dirname, '../preview'),
	];
	for (const candidate of candidates) {
		try {
			await access(path.join(candidate, 'index.html'));
			return candidate;
		} catch {
			// Try the source-tree build location next.
		}
	}
	throw new Error('Packaged OG preview is missing. Run `npm run build` before generating images.');
}

function closeServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}
