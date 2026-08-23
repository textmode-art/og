import type { PreviewOutcome, PreviewRenderRequest } from '../shared/preview-protocol';
import { PREVIEW_PROTOCOL_VERSION, isPreviewRenderRequest } from '../shared/preview-protocol';
import { renderLayout, type RenderedLayout } from './layout-renderer';
import { renderSketchAtFrame, type RenderedSketch } from './editor-sketch-runtime';

declare global {
	interface Window {
		renderOg(request: PreviewRenderRequest): Promise<PreviewOutcome>;
	}
}

let renderUsed = false;

window.renderOg = async (request) => {
	if (renderUsed || !isPreviewRenderRequest(request)) {
		return failure('INVALID_REQUEST', 'Preview endpoint accepts one valid request per browser context.');
	}
	renderUsed = true;
	document.body.dataset.status = 'running';
	delete document.body.dataset.error;

	let renderedSketch: RenderedSketch | undefined;
	let renderedLayout: RenderedLayout | undefined;
	try {
		try {
			renderedSketch = await renderSketchAtFrame(request.code, request.frame, markDiagnostic);
		} catch (error) {
			return failure('SKETCH_FAILED', messageOf(error));
		}
		try {
			renderedLayout = await renderLayout(request.layout, request.branding, request.darken);
		} catch (error) {
			renderedSketch.dispose();
			return failure('LAYOUT_FAILED', messageOf(error));
		}

		document.body.dataset.status = 'ready';
		const dispose = (): void => {
			renderedLayout?.dispose();
			renderedSketch?.dispose();
		};
		window.addEventListener('pagehide', dispose, { once: true });
		return {
			protocolVersion: PREVIEW_PROTOCOL_VERSION,
			ok: true,
			metadata: {
				frame: renderedSketch.frame,
				seconds: renderedSketch.seconds,
				descriptionLines: renderedLayout.descriptionLines,
				layout: renderedLayout.layout,
			},
		};
	} catch (error) {
		renderedLayout?.dispose();
		renderedSketch?.dispose();
		return failure('LAYOUT_FAILED', messageOf(error));
	}
};

function failure(code: 'INVALID_REQUEST' | 'SKETCH_FAILED' | 'LAYOUT_FAILED', message: string): PreviewOutcome {
	document.body.dataset.status = 'error';
	document.body.dataset.error = message;
	return { protocolVersion: PREVIEW_PROTOCOL_VERSION, ok: false, error: { code, message } };
}

function markDiagnostic(error: unknown): void {
	document.body.dataset.status = 'error';
	document.body.dataset.error = messageOf(error);
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
