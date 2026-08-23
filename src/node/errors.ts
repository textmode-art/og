export type OgErrorCode =
	| 'INVALID_REQUEST'
	| 'INVALID_BRANDING'
	| 'INVALID_SOURCE'
	| 'SESSION_START_FAILED'
	| 'SOURCE_READ_FAILED'
	| 'ASSET_ACCESS_DENIED'
	| 'RENDER_TIMEOUT'
	| 'SKETCH_FAILED'
	| 'LAYOUT_FAILED'
	| 'PROTOCOL_MISMATCH'
	| 'CAPTURE_FAILED'
	| 'INVALID_OUTPUT_IMAGE'
	| 'OUTPUT_COMMIT_FAILED'
	| 'CLEANUP_FAILED';

export type OgErrorStage =
	'plan' | 'prepare' | 'session' | 'source' | 'render' | 'layout' | 'capture' | 'validate' | 'commit';

export interface CleanupDiagnostic {
	readonly operation: string;
	readonly message: string;
	readonly cause?: unknown;
}

export class OgGenerationError extends Error {
	readonly code: OgErrorCode;
	readonly stage: OgErrorStage;
	readonly jobId?: string;
	readonly cleanupDiagnostics: CleanupDiagnostic[];

	constructor(
		message: string,
		options: {
			code: OgErrorCode;
			stage: OgErrorStage;
			jobId?: string;
			cause?: unknown;
			cleanupDiagnostics?: readonly CleanupDiagnostic[];
		}
	) {
		super(message, { cause: options.cause });
		this.name = 'OgGenerationError';
		this.code = options.code;
		this.stage = options.stage;
		this.jobId = options.jobId;
		this.cleanupDiagnostics = [...(options.cleanupDiagnostics ?? [])];
	}
}

export function isOgGenerationError(error: unknown): error is OgGenerationError {
	return error instanceof OgGenerationError;
}

export function asOgGenerationError(
	error: unknown,
	defaults: { code: OgErrorCode; stage: OgErrorStage; jobId?: string; message?: string }
): OgGenerationError {
	if (error instanceof OgGenerationError) {
		if (defaults.jobId && !error.jobId) {
			return new OgGenerationError(error.message, {
				code: error.code,
				stage: error.stage,
				jobId: defaults.jobId,
				cause: error.cause,
				cleanupDiagnostics: error.cleanupDiagnostics,
			});
		}
		return error;
	}
	const message = defaults.message ?? (error instanceof Error ? error.message : String(error));
	return new OgGenerationError(message, {
		code: defaults.code,
		stage: defaults.stage,
		jobId: defaults.jobId,
		cause: error,
	});
}

export function addCleanupDiagnostics(error: unknown, diagnostics: readonly CleanupDiagnostic[]): OgGenerationError {
	const normalized = asOgGenerationError(error, {
		code: 'CLEANUP_FAILED',
		stage: 'commit',
	});
	normalized.cleanupDiagnostics.push(...diagnostics);
	return normalized;
}
