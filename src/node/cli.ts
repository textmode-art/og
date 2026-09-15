#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, type ParseArgsConfig } from 'node:util';
import {
	MAX_OG_DARKEN,
	MAX_OG_FRAME,
	MIN_OG_DARKEN,
	MIN_OG_FRAME,
	type OgImageJob,
	type OgSketchSource,
} from '../shared/public-contracts.js';
import { readBrandingConfig } from './branding.js';
import { generateOgImages } from './generator.js';

const PACKAGE_VERSION = '0.1.0';
const USAGE = `Generate Open Graph images from editor.textmode.art sketches.

Usage:
  textmode-og gallery <file-or-share-url> --title <text> [options]
  textmode-og main <file-or-share-url> [options]
  textmode-og install-browser
  textmode-og --help
  textmode-og --version

Common options:
  --output <path>       Output PNG (default: ./og.png)
  --frame <1-1000>      Frame to capture (default: 60)
  --darken <0-100>      Artwork darken percentage
  --branding <path>     Branding override JSON
  -h, --help            Show command help

Gallery options:
  --title <text>        Gallery title (required)
  --description <text>  Optional gallery description
  --author <text>       Optional author name`;

type RenderCliCommand = {
	kind: 'gallery' | 'main';
	help: boolean;
	source?: string;
	output?: string;
	frame?: number;
	darken?: number;
	branding?: string;
	title?: string;
	description?: string;
	author?: string;
};

type CliCommand =
	RenderCliCommand | { kind: 'install-browser'; help: boolean } | { kind: 'root'; help: boolean; version: boolean };

const COMMON_OPTIONS = {
	output: { type: 'string' },
	frame: { type: 'string' },
	darken: { type: 'string' },
	branding: { type: 'string' },
	help: { type: 'boolean', short: 'h' },
} as const satisfies ParseArgsConfig['options'];

const RENDER_OPTIONS = {
	...COMMON_OPTIONS,
	title: { type: 'string' },
	description: { type: 'string' },
	author: { type: 'string' },
} as const satisfies ParseArgsConfig['options'];

type RenderValues = {
	output?: string;
	frame?: string;
	darken?: string;
	branding?: string;
	help?: boolean;
	title?: string;
	description?: string;
	author?: string;
};

export function parseCliCommand(args: string[]): CliCommand {
	if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
		return { kind: 'root', help: true, version: false };
	}
	if (args[0] === '--version') return { kind: 'root', help: false, version: true };
	const [command, ...commandArgs] = args;
	if (command === 'install-browser') {
		const parsed = parseStrict(commandArgs, { help: { type: 'boolean', short: 'h' } });
		if (parsed.positionals.length > 0) {
			throw new CliUsageError(`Unexpected argument: ${parsed.positionals[0]}`);
		}
		return { kind: 'install-browser', help: parsed.values.help ?? false };
	}
	if (command !== 'gallery' && command !== 'main') {
		throw new CliUsageError(`Unknown command: ${command}`);
	}

	const parsed = parseStrict(commandArgs, RENDER_OPTIONS);
	const values = parsed.values as RenderValues;
	for (const optionName of Object.keys(RENDER_OPTIONS)) rejectDuplicateOption(parsed.tokens, optionName);
	if (parsed.positionals.length > 1) {
		throw new CliUsageError(`Unexpected extra argument: ${parsed.positionals[1]}`);
	}
	const help = values.help ?? false;
	const source = parsed.positionals[0];
	if (!help && !source) throw new CliUsageError('Provide a sketch file or editor share URL.');
	if (!help && command === 'gallery' && !values.title?.trim()) {
		throw new CliUsageError('Gallery images require --title.');
	}
	if (
		command === 'main' &&
		(values.title !== undefined || values.description !== undefined || values.author !== undefined)
	) {
		throw new CliUsageError('Gallery metadata options cannot be used with the main command.');
	}

	return {
		kind: command,
		help,
		source,
		output: values.output,
		frame: parseIntegerOption(values.frame, '--frame', MIN_OG_FRAME, MAX_OG_FRAME),
		darken: parseIntegerOption(values.darken, '--darken', MIN_OG_DARKEN, MAX_OG_DARKEN),
		branding: values.branding,
		title: command === 'gallery' ? values.title : undefined,
		description: command === 'gallery' ? values.description : undefined,
		author: command === 'gallery' ? values.author : undefined,
	};
}

async function runCli(args: string[]): Promise<void> {
	const command = parseCliCommand(args);
	if (command.kind === 'root') {
		console.log(command.version ? PACKAGE_VERSION : USAGE);
		return;
	}
	if (command.help) {
		console.log(command.kind === 'install-browser' ? 'Usage: textmode-og install-browser' : USAGE);
		return;
	}
	if (command.kind === 'install-browser') {
		await installBrowser();
		return;
	}

	const source = parseSketchSource(command.source!);
	const outputPath = path.resolve(command.output ?? 'og.png');
	const branding = command.branding === undefined ? undefined : await readBrandingConfig(command.branding);
	const job: OgImageJob = {
		id: source.kind === 'file' ? path.basename(source.path, path.extname(source.path)) : command.kind,
		source,
		outputPath,
		frame: command.frame,
		darken: command.darken,
		layout:
			command.kind === 'gallery'
				? {
						kind: 'gallery',
						title: command.title!,
						description: command.description ?? null,
						authorName: command.author ?? null,
					}
				: { kind: 'main' },
	};
	const [result] = await generateOgImages({ jobs: [job], branding });
	console.log(`Generated ${result!.outputPath} at frame ${result!.frame}.`);
}

export function parseSketchSource(value: string): OgSketchSource {
	if (/^https?:\/\//i.test(value)) return { kind: 'editor-share-url', url: value };
	return { kind: 'file', path: path.resolve(value) };
}

function parseStrict<T extends ParseArgsConfig['options']>(args: string[], options: T) {
	try {
		return parseArgs({
			args,
			options,
			allowPositionals: true,
			strict: true,
			tokens: true,
		});
	} catch (error) {
		throw new CliUsageError(error instanceof Error ? error.message : String(error), { cause: error });
	}
}

function rejectDuplicateOption(tokens: Array<{ kind: string; name?: string }>, optionName: string): void {
	const count = tokens.filter((token) => token.kind === 'option' && token.name === optionName).length;
	if (count > 1) throw new CliUsageError(`--${optionName} may only be specified once.`);
}

function parseIntegerOption(
	value: string | undefined,
	label: string,
	minimum: number,
	maximum: number
): number | undefined {
	if (value === undefined) return undefined;
	const parsed = value.trim() ? Number(value) : Number.NaN;
	if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
		throw new CliUsageError(`${label} must be an integer from ${minimum} to ${maximum}.`);
	}
	return parsed;
}

export function resolvePlaywrightCli(): string {
	const require = createRequire(import.meta.url);
	const packageJsonPath = require.resolve('playwright/package.json');
	return path.resolve(path.dirname(packageJsonPath), 'cli.js');
}

async function installBrowser(): Promise<void> {
	const playwrightCli = resolvePlaywrightCli();
	const child = spawn(process.execPath, [playwrightCli, 'install', 'chromium', '--no-shell'], {
		stdio: 'inherit',
	});
	const exitCode = await new Promise<number>((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code) => resolve(code ?? 1));
	});
	if (exitCode !== 0) throw new Error(`Playwright browser installation failed with exit code ${exitCode}.`);
}

class CliUsageError extends Error {}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
	runCli(process.argv.slice(2)).catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		if (error instanceof CliUsageError) console.error(`\n${USAGE}`);
		process.exitCode = 1;
	});
}
