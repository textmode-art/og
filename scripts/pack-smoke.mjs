import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'textmode-og-pack-'));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
	const filename = execFileSync(npmCommand, ['pack', '--silent', '--pack-destination', temporaryRoot], {
		cwd: projectRoot,
		encoding: 'utf8',
	})
		.trim()
		.split(/\r?\n/)
		.at(-1);
	if (!filename) throw new Error('npm pack did not report a tarball filename.');
	const tarballPath = path.join(temporaryRoot, filename);
	const consumerRoot = path.join(temporaryRoot, 'consumer');
	await mkdir(consumerRoot);
	await writeFile(path.join(consumerRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
	execFileSync(
		npmCommand,
		['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', consumerRoot, tarballPath],
		{ cwd: temporaryRoot, stdio: 'inherit' }
	);
	const cliPath = path.join(
		consumerRoot,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'textmode-og.cmd' : 'textmode-og'
	);
	const help = execFileSync(cliPath, ['--help'], {
		cwd: consumerRoot,
		encoding: 'utf8',
	});
	if (!help.includes('textmode-og gallery')) {
		throw new Error(`Packed CLI help is incomplete: ${JSON.stringify(help)}`);
	}

	const smokePath = path.join(consumerRoot, 'smoke.mjs');
	await writeFile(
		smokePath,
		`import { generateOgImages } from '@textmode/og';
await generateOgImages({
  jobs: [{
    source: { kind: 'code', code: "t.draw(() => { t.background('#111'); t.print('PACKED', 1, 1); });" },
    outputPath: './packed.png',
    frame: 1,
    layout: { kind: 'main' }
  }]
});
`
	);
	execFileSync(process.execPath, [smokePath], { cwd: consumerRoot, stdio: 'inherit' });
	const image = await readFile(path.join(consumerRoot, 'packed.png'));
	if (image.length < 24 || image.toString('ascii', 12, 16) !== 'IHDR') {
		throw new Error('Packed consumer did not produce a PNG.');
	}
	console.log(`Verified packed consumer: ${filename}`);
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}
