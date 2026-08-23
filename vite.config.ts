import path from 'node:path';
import { defineConfig } from 'vite';
import { PREVIEW_BASE_PATH } from './src/shared/preview-paths.js';

export default defineConfig({
	base: PREVIEW_BASE_PATH,
	root: path.resolve(import.meta.dirname, 'src/preview'),
	publicDir: 'public',
	build: {
		emptyOutDir: true,
		outDir: path.resolve(import.meta.dirname, 'dist/preview'),
		rollupOptions: {
			input: path.resolve(import.meta.dirname, 'src/preview/index.html'),
		},
	},
});
