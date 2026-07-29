import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	base: '/__textmode-og/',
	root: path.resolve(import.meta.dirname, 'src/preview'),
	publicDir: 'public',
	build: {
		emptyOutDir: false,
		outDir: path.resolve(import.meta.dirname, 'dist/preview'),
		rollupOptions: {
			input: path.resolve(import.meta.dirname, 'src/preview/index.html'),
		},
	},
});
