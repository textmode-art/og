export const PREVIEW_BASE_PATH = '/__textmode-og/';
export const PREVIEW_JOB_PATH = '/jobs/';

export function previewAssetPath(relativePath: string): string {
	return `${PREVIEW_BASE_PATH}${relativePath.replace(/^\/+/, '')}`;
}

export function previewJobPath(token: string, relativePath = ''): string {
	const suffix = relativePath.replace(/^\/+/, '');
	return `${PREVIEW_JOB_PATH}${encodeURIComponent(token)}/${suffix}`;
}
