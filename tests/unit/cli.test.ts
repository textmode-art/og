import { describe, expect, it } from 'vitest';
import { parseCliCommand, parseSketchSource } from '../../src/node/cli';

describe('textmode-og CLI', () => {
	it('parses gallery and main renders', () => {
		expect(
			parseCliCommand([
				'gallery',
				'./sketch.js',
				'--title',
				'Signal Bloom',
				'--description',
				'Example',
				'--author',
				'Artist',
				'--frame',
				'120',
				'--darken',
				'70',
			])
		).toMatchObject({
			kind: 'gallery',
			source: './sketch.js',
			title: 'Signal Bloom',
			description: 'Example',
			author: 'Artist',
			frame: 120,
			darken: 70,
		});
		expect(parseCliCommand(['main', './sketch.js'])).toMatchObject({
			kind: 'main',
			source: './sketch.js',
		});
	});

	it('parses root and browser commands', () => {
		expect(parseCliCommand([])).toEqual({ kind: 'root', help: true, version: false });
		expect(parseCliCommand(['--version'])).toEqual({ kind: 'root', help: false, version: true });
		expect(parseCliCommand(['install-browser'])).toEqual({ kind: 'install-browser', help: false });
	});

	it('rejects invalid command combinations and ranges', () => {
		expect(() => parseCliCommand(['gallery', './sketch.js'])).toThrow('require --title');
		expect(() => parseCliCommand(['main', './sketch.js', '--title', 'Nope'])).toThrow(
			'cannot be used with the main'
		);
		expect(() => parseCliCommand(['main', './sketch.js', '--frame', '0'])).toThrow('1 to 1000');
		expect(() => parseCliCommand(['main', './sketch.js', '--darken', '101'])).toThrow('0 to 100');
		expect(() => parseCliCommand(['main', './sketch.js', '--frame', '1', '--frame', '2'])).toThrow(
			'only be specified once'
		);
		expect(() => parseCliCommand(['unknown'])).toThrow('Unknown command');
	});

	it('recognizes editor share URLs without fetching them', () => {
		expect(parseSketchSource('https://editor.textmode.art/#share=value')).toEqual({
			kind: 'editor-share-url',
			url: 'https://editor.textmode.art/#share=value',
		});
		expect(parseSketchSource('./sketch.js')).toMatchObject({ kind: 'file' });
	});
});
