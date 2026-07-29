import path from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 120_000,
	outputDir: path.join(import.meta.dirname, 'test-results'),
	preserveOutput: 'failures-only',
	updateSnapshots: 'none',
	snapshotPathTemplate: path.join(import.meta.dirname, 'tests/browser/__snapshots__/{arg}{ext}'),
	reporter: process.env.CI
		? [['list'], ['html', { outputFolder: path.join(import.meta.dirname, 'playwright-report'), open: 'never' }]]
		: 'list',
});
