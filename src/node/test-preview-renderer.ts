import { OG_HEIGHT, OG_WIDTH } from '../shared/public-contracts.js';
import type { PreviewRenderInput, PreviewRenderer, RenderedPng } from './preview-renderer.js';

export interface TestPreviewRendererOptions {
	readonly render?: (input: PreviewRenderInput) => RenderedPng | Promise<RenderedPng>;
	readonly close?: () => void | Promise<void>;
}

export class TestPreviewRenderer implements PreviewRenderer {
	readonly inputs: PreviewRenderInput[] = [];
	closeCount = 0;
	private readonly renderResult: (input: PreviewRenderInput) => RenderedPng | Promise<RenderedPng>;
	private readonly closeResult: () => void | Promise<void>;

	constructor(options: TestPreviewRendererOptions = {}) {
		this.renderResult = options.render ?? ((input) => ({ bytes: minimalPng(), metadata: metadataFor(input) }));
		this.closeResult = options.close ?? (() => undefined);
	}

	async render(input: PreviewRenderInput, signal: AbortSignal): Promise<RenderedPng> {
		if (signal.aborted) throw new Error('Test renderer aborted.');
		this.inputs.push(input);
		return this.renderResult(input);
	}

	async close(): Promise<void> {
		this.closeCount += 1;
		await this.closeResult();
	}
}

function metadataFor(input: PreviewRenderInput) {
	return {
		frame: input.frame,
		seconds: Math.max(0, input.frame - 1) / 60,
		descriptionLines: input.layout.kind === 'gallery' ? 1 : 0,
		layout: input.layout.kind,
	};
}

function minimalPng(): Uint8Array {
	const buffer = Buffer.alloc(24);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
	buffer.write('IHDR', 12, 'ascii');
	buffer.writeUInt32BE(OG_WIDTH, 16);
	buffer.writeUInt32BE(OG_HEIGHT, 20);
	return buffer;
}
