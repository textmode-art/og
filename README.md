# @textmode/og

<div align="center">

<img alt="@textmode/og: generate Open Graph images from textmode sketches" src=".github/assets/readme-og.png" />

| [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=data:image/svg%2Bxml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDAwIDQwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHBhdGggZD0iTTEzNi40NDQgMjIxLjU1NkMxMjMuNTU4IDIyNS4yMTMgMTE1LjEwNCAyMzEuNjI1IDEwOS41MzUgMjM4LjAzMkMxMTQuODY5IDIzMy4zNjQgMTIyLjAxNCAyMjkuMDggMTMxLjY1MiAyMjYuMzQ4QzE0MS41MSAyMjMuNTU0IDE0OS45MiAyMjMuNTc0IDE1Ni44NjkgMjI0LjkxNVYyMTkuNDgxQzE1MC45NDEgMjE4LjkzOSAxNDQuMTQ1IDIxOS4zNzEgMTM2LjQ0NCAyMjEuNTU2Wk0xMDguOTQ2IDE3NS44NzZMNjEuMDg5NSAxODguNDg0QzYxLjA4OTUgMTg4LjQ4NCA2MS45NjE3IDE4OS43MTYgNjMuNTc2NyAxOTEuMzZMMTA0LjE1MyAxODAuNjY4QzEwNC4xNTMgMTgwLjY2OCAxMDMuNTc4IDE4OC4wNzcgOTguNTg0NyAxOTQuNzA1QzEwOC4wMyAxODcuNTU5IDEwOC45NDYgMTc1Ljg3NiAxMDguOTQ2IDE3NS44NzZaTTE0OS4wMDUgMjg4LjM0N0M4MS42NTgyIDMwNi40ODYgNDYuMDI3MiAyMjguNDM4IDM1LjIzOTYgMTg3LjkyOEMzMC4yNTU2IDE2OS4yMjkgMjguMDc5OSAxNTUuMDY3IDI3LjUgMTQ1LjkyOEMyNy40Mzc3IDE0NC45NzkgMjcuNDY2NSAxNDQuMTc5IDI3LjUzMzYgMTQzLjQ0NkMyNC4wNCAxNDMuNjU3IDIyLjM2NzQgMTQ1LjQ3MyAyMi43MDc3IDE1MC43MjFDMjMuMjg3NiAxNTkuODU1IDI1LjQ2MzMgMTc0LjAxNiAzMC40NDczIDE5Mi43MjFDNDEuMjMwMSAyMzMuMjI1IDc2Ljg2NTkgMzExLjI3MyAxNDQuMjEzIDI5My4xMzRDMTU4Ljg3MiAyODkuMTg1IDE2OS44ODUgMjgxLjk5MiAxNzguMTUyIDI3Mi44MUMxNzAuNTMyIDI3OS42OTIgMTYwLjk5NSAyODUuMTEyIDE0OS4wMDUgMjg4LjM0N1pNMTYxLjY2MSAxMjguMTFWMTMyLjkwM0gxODguMDc3QzE4Ny41MzUgMTMxLjIwNiAxODYuOTg5IDEyOS42NzcgMTg2LjQ0NyAxMjguMTFIMTYxLjY2MVoiIGZpbGw9IiNmZmYiLz4gPHBhdGggZD0iTTE5My45ODEgMTY3LjU4NEMyMDUuODYxIDE3MC45NTggMjEyLjE0NCAxNzkuMjg3IDIxNS40NjUgMTg2LjY1OEwyMjguNzExIDE5MC40MkMyMjguNzExIDE5MC40MiAyMjYuOTA0IDE2NC42MjMgMjAzLjU3IDE1Ny45OTVDMTgxLjc0MSAxNTEuNzkzIDE2OC4zMDggMTcwLjEyNCAxNjYuNjc0IDE3Mi40OTZDMTczLjAyNCAxNjcuOTcyIDE4Mi4yOTcgMTY0LjI2OCAxOTMuOTgxIDE2Ny41ODRaTTI5OS40MjIgMTg2Ljc3N0MyNzcuNTczIDE4MC41NDcgMjY0LjE0NSAxOTguOTE2IDI2Mi41MzUgMjAxLjI1NUMyNjguODkgMTk2LjczNiAyNzguMTU4IDE5My4wMzEgMjg5LjgzNyAxOTYuMzYyQzMwMS42OTggMTk5Ljc0MSAzMDcuOTc2IDIwOC4wNiAzMTEuMzA3IDIxNS40MzZMMzI0LjU3MiAyMTkuMjEyQzMyNC41NzIgMjE5LjIxMiAzMjIuNzM2IDE5My40MSAyOTkuNDIyIDE4Ni43NzdaTTI4Ni4yNjIgMjU0Ljc5NUwxNzYuMDcyIDIyMy45OUMxNzYuMDcyIDIyMy45OSAxNzcuMjY1IDIzMC4wMzggMTgxLjg0MiAyMzcuODY5TDI3NC42MTcgMjYzLjgwNUMyODIuMjU1IDI1OS4zODYgMjg2LjI2MiAyNTQuNzk1IDI4Ni4yNjIgMjU0Ljc5NVpNMjA5Ljg2NyAzMjEuMTAyQzEyMi42MTggMjk3LjcxIDEzMy4xNjYgMTg2LjU0MyAxNDcuMjg0IDEzMy44NjVDMTUzLjA5NyAxMTIuMTU2IDE1OS4wNzMgOTYuMDIwMyAxNjQuMDI5IDg1LjIwNEMxNjEuMDcyIDg0LjU5NTMgMTU4LjYyMyA4Ni4xNTI5IDE1Ni4yMDMgOTEuMDc0NkMxNTAuOTQxIDEwMS43NDcgMTQ0LjIxMiAxMTkuMTI0IDEzNy43IDE0My40NUMxMjMuNTg2IDE5Ni4xMjcgMTEzLjAzOCAzMDcuMjkgMjAwLjI4MyAzMzAuNjgyQzI0MS40MDYgMzQxLjY5OSAyNzMuNDQyIDMyNC45NTUgMjk3LjMyMyAyOTguNjU5QzI3NC42NTUgMzE5LjE5IDI0NS43MTQgMzMwLjcwMSAyMDkuODY3IDMyMS4xMDJaIiBmaWxsPSIjZmZmIi8%2BIDxwYXRoIGQ9Ik0xNjEuNjYxIDI2Mi4yOTZWMjM5Ljg2M0w5OS4zMzI0IDI1Ny41MzdDOTkuMzMyNCAyNTcuNTM3IDEwMy45MzggMjMwLjc3NyAxMzYuNDQ0IDIyMS41NTZDMTQ2LjMwMiAyMTguNzYyIDE1NC43MTMgMjE4Ljc4MSAxNjEuNjYxIDIyMC4xMjNWMTI4LjExSDE5Mi44NjlDMTg5LjQ3MSAxMTcuNjEgMTg2LjE4NCAxMDkuNTI2IDE4My40MjMgMTAzLjkwOUMxNzguODU2IDk0LjYxMiAxNzQuMTc0IDEwMC43NzUgMTYzLjU0NSAxMDkuNjY1QzE1Ni4wNTkgMTE1LjkxOSAxMzcuMTM5IDEyOS4yNjEgMTA4LjY2OCAxMzYuOTMzQzgwLjE5NjYgMTQ0LjYxIDU3LjE3OSAxNDIuNTc0IDQ3LjU3NTIgMTQwLjkxMUMzMy45NjAxIDEzOC41NjIgMjYuODM4NyAxMzUuNTcyIDI3LjUwNDkgMTQ1LjkyOEMyOC4wODQ3IDE1NS4wNjIgMzAuMjYwNSAxNjkuMjI0IDM1LjI0NDUgMTg3LjkyOEM0Ni4wMjcyIDIyOC40MzMgODEuNjYzIDMwNi40ODEgMTQ5LjAxIDI4OC4zNDJDMTY2LjYwMiAyODMuNjAyIDE3OS4wMTkgMjc0LjIzMyAxODcuNjI2IDI2Mi4yOTFIMTYxLjY2MVYyNjIuMjk2Wk02MS4wODQ4IDE4OC40ODRMMTA4Ljk0NiAxNzUuODc2QzEwOC45NDYgMTc1Ljg3NiAxMDcuNTUxIDE5NC4yODggODkuNjA4NyAxOTkuMDE4QzcxLjY2MTQgMjAzLjc0MyA2MS4wODQ4IDE4OC40ODQgNjEuMDg0OCAxODguNDg0WiIgZmlsbD0iI2ZmZiIvPiA8cGF0aCBkPSJNMzQxLjc4NiAxMjkuMTc0QzMyOS4zNDUgMTMxLjM1NSAyOTkuNDk4IDEzNC4wNzIgMjYyLjYxMiAxMjQuMTg1QzIyNS43MTYgMTE0LjMwNCAyMDEuMjM2IDk3LjAyMjQgMTkxLjUzNyA4OC44OTk0QzE3Ny43ODggNzcuMzgzNCAxNzEuNzQgNjkuMzgwMiAxNjUuNzg4IDgxLjQ4NTdDMTYwLjUyNiA5Mi4xNjMgMTUzLjc5NyAxMDkuNTQgMTQ3LjI4NCAxMzMuODY2QzEzMy4xNzEgMTg2LjU0MyAxMjIuNjIzIDI5Ny43MDYgMjA5Ljg2NyAzMjEuMDk4QzI5Ny4wOTMgMzQ0LjQ3IDM0My41MyAyNDIuOTIgMzU3LjY0NCAxOTAuMjM4QzM2NC4xNTcgMTY1LjkxNyAzNjcuMDEzIDE0Ny41IDM2Ny43OTkgMTM1LjYyNUMzNjguNjk1IDEyMi4xNzMgMzU5LjQ1NSAxMjYuMDc4IDM0MS43ODYgMTI5LjE3NFpNMTY2LjQ5NyAxNzIuNzU2QzE2Ni40OTcgMTcyLjc1NiAxODAuMjQ2IDE1MS4zNzIgMjAzLjU2NSAxNThDMjI2Ljg5OSAxNjQuNjI4IDIyOC43MDYgMTkwLjQyNSAyMjguNzA2IDE5MC40MjVMMTY2LjQ5NyAxNzIuNzU2Wk0yMjMuNDIgMjY4LjcxM0MxODIuNDAzIDI1Ni42OTggMTc2LjA3NyAyMjMuOTkgMTc2LjA3NyAyMjMuOTlMMjg2LjI2MiAyNTQuNzk2QzI4Ni4yNjIgMjU0Ljc5MSAyNjQuMDIxIDI4MC41NzggMjIzLjQyIDI2OC43MTNaTTI2Mi4zNzcgMjAxLjQ5NUMyNjIuMzc3IDIwMS40OTUgMjc2LjEwNyAxODAuMTI2IDI5OS40MjIgMTg2Ljc3M0MzMjIuNzM2IDE5My40MTEgMzI0LjU3MiAyMTkuMjA4IDMyNC41NzIgMjE5LjIwOEwyNjIuMzc3IDIwMS40OTVaIiBmaWxsPSIjZmZmIi8%2BIDxwYXRoIGQ9Ik0xMzkuODggMjQ2LjA0TDk5LjMzMjQgMjU3LjUzMkM5OS4zMzI0IDI1Ny41MzIgMTAzLjczNyAyMzIuNDQgMTMzLjYwNyAyMjIuNDk2TDExMC42NDcgMTM2LjMzTDEwOC42NjMgMTM2LjkzM0M4MC4xOTE4IDE0NC42MTEgNTcuMTc0MiAxNDIuNTc0IDQ3LjU3MDQgMTQwLjkxMUMzMy45NTU0IDEzOC41NjMgMjYuODM0IDEzNS41NzIgMjcuNTAwMSAxNDUuOTI5QzI4LjA4IDE1NS4wNjMgMzAuMjU1NyAxNjkuMjI0IDM1LjIzOTcgMTg3LjkyOUM0Ni4wMjI1IDIyOC40MzMgODEuNjU4MyAzMDYuNDgxIDE0OS4wMDUgMjg4LjM0MkwxNTAuOTg5IDI4Ny43MTlMMTM5Ljg4IDI0Ni4wNFpNNjEuMDg0OCAxODguNDg1TDEwOC45NDYgMTc1Ljg3NkMxMDguOTQ2IDE3NS44NzYgMTA3LjU1MSAxOTQuMjg4IDg5LjYwODcgMTk5LjAxOEM3MS42NjE1IDIwMy43NDMgNjEuMDg0OCAxODguNDg1IDYxLjA4NDggMTg4LjQ4NVoiIGZpbGw9IiNmZmYiLz4gPHBhdGggZD0iTTIyNS4yNyAyNjkuMTYzTDIyMy40MTUgMjY4LjcxMkMxODIuMzk4IDI1Ni42OTggMTc2LjA3MiAyMjMuOTkgMTc2LjA3MiAyMjMuOTlMMjMyLjg5IDIzOS44NzJMMjYyLjk3MSAxMjQuMjgxTDI2Mi42MDcgMTI0LjE4NUMyMjUuNzExIDExNC4zMDQgMjAxLjIzMiA5Ny4wMjI0IDE5MS41MzIgODguODk5NEMxNzcuNzgzIDc3LjM4MzQgMTcxLjczNSA2OS4zODAyIDE2NS43ODMgODEuNDg1N0MxNjAuNTI2IDkyLjE2MyAxNTMuNzk3IDEwOS41NCAxNDcuMjg0IDEzMy44NjZDMTMzLjE3MSAxODYuNTQzIDEyMi42MjMgMjk3LjcwNiAyMDkuODY3IDMyMS4wOTdMMjExLjY1NSAzMjEuNUwyMjUuMjcgMjY5LjE2M1pNMTY2LjQ5NyAxNzIuNzU2QzE2Ni40OTcgMTcyLjc1NiAxODAuMjQ2IDE1MS4zNzIgMjAzLjU2NSAxNThDMjI2Ljg5OSAxNjQuNjI4IDIyOC43MDYgMTkwLjQyNSAyMjguNzA2IDE5MC40MjVMMTY2LjQ5NyAxNzIuNzU2WiIgZmlsbD0iI2ZmZiIvPiA8cGF0aCBkPSJNMTQxLjk0NiAyNDUuNDUxTDEzMS4wNzIgMjQ4LjUzN0MxMzMuNjQxIDI2My4wMTkgMTM4LjE2OSAyNzYuOTE3IDE0NS4yNzYgMjg5LjE5NUMxNDYuNTEzIDI4OC45MjIgMTQ3Ljc0IDI4OC42ODcgMTQ5IDI4OC4zNDJDMTUyLjMwMiAyODcuNDUxIDE1NS4zNjQgMjg2LjM0OCAxNTguMzEyIDI4NS4xNDVDMTUwLjM3MSAyNzMuMzYxIDE0NS4xMTggMjU5Ljc4OSAxNDEuOTQ2IDI0NS40NTFaTTEzNy43IDE0My40NTFDMTMyLjExMiAxNjQuMzA3IDEyNy4xMTMgMTk0LjMyNiAxMjguNDg5IDIyNC40MzZDMTMwLjk1MiAyMjMuMzY3IDEzMy41NTQgMjIyLjM3MSAxMzYuNDQ0IDIyMS41NTFMMTM4LjQ1NyAyMjEuMTAxQzEzNi4wMDMgMTg4LjkzOSAxNDEuMzA4IDE1Ni4xNjUgMTQ3LjI4NCAxMzMuODY2QzE0OC43OTkgMTI4LjIyNSAxNTAuMzE4IDEyMi45NzggMTUxLjgzMiAxMTguMDg1QzE0OS4zOTMgMTE5LjYzNyAxNDYuNzY3IDEyMS4yMjggMTQzLjc3NiAxMjIuODY3QzE0MS43NTkgMTI5LjA5MyAxMzkuNzIyIDEzNS44OTggMTM3LjcgMTQzLjQ1MVoiIGZpbGw9IiNmZmYiLz4gPC9zdmc%2B&logoColor=white)](https://playwright.dev/) | [![docs](https://img.shields.io/badge/docs-vitepress-646cff?logo=vitepress&logoColor=white)](https://code.textmode.art/) [![Discord](https://img.shields.io/discord/1357070706181017691?color=5865F2&label=Discord&logo=discord&logoColor=white)](https://discord.gg/sjrw8QXNks) | [![ko-fi](https://shields.io/badge/ko--fi-donate-ff5f5f?logo=ko-fi)](https://ko-fi.com/V7V8JG2FY) [![GitHub-sponsors](https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/humanbydefinition) |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

</div>

`@textmode/og` is an Open Graph image generator for the [textmode.js](https://github.com/humanbydefinition/textmode.js) ecosystem. It renders deterministic 1200×630 images from [editor.textmode.art](https://editor.textmode.art/) sketches through a CLI or a Node interface.

Input sketches use the editor runtime directly: `t`, silent `audio`, synth helpers, and the editor add-ons are injected, so a sketch must not call `textmode.create()`. The package provides the gallery and main editor layouts, deterministic frame capture, local sketch assets, PNG validation, and atomic output writes.

## Features

- **CLI and Node interface** - Gallery and main editor layouts through one command or `generateOgImages()`
- **Deterministic frame capture** - Render any frame from 1 to 1000 for stable, repeatable output
- **Local sketch assets** - Relative images, fonts, video, and data resolve against the sketch directory
- **Atomic output writes** - Each PNG is validated and renamed into place; a failed job preserves an existing destination image
- **Branding overrides** - Swap the logo and label text without touching the fixed layout geometry
- **Secure execution** - Sketches run in isolated browser contexts without Node access

## Installation

```bash
npm install --save-dev @textmode/og
npx textmode-og install-browser
```

Requires Node.js 24 or newer. Chromium is installed only when requested.
Package installation does not download a browser.

## CLI

Create a gallery image from a local editor-style sketch:

```bash
npx textmode-og gallery ./sketch.js \
  --title "Signal Bloom" \
  --description "A deterministic textmode sketch." \
  --author "Example Artist" \
  --output ./og.png
```

Create the main layout:

```bash
npx textmode-og main ./sketch.js --frame 120 --darken 70
```

An `https://editor.textmode.art/#share=...` URL can be used instead of a file.
Quote share URLs in the shell. They are decoded locally; the CLI never fetches
the editor site.

Local files resolve relative images, fonts, video, and data against the
sketch’s directory. Share URLs have no local asset root. Remote assets remain
subject to normal browser and CORS rules.

Run `npx textmode-og --help` for all options.

## Node interface

```ts
import { generateOgImages } from '@textmode/og';

const results = await generateOgImages({
	jobs: [
		{
			id: 'signal-bloom',
			source: { kind: 'file', path: './sketch.js' },
			outputPath: './og.png',
			frame: 60,
			layout: {
				kind: 'gallery',
				title: 'Signal Bloom',
				description: 'A deterministic textmode sketch.',
				authorName: 'Example Artist',
			},
		},
	],
});
```

Jobs run sequentially in one browser session and isolated browser contexts.
Each output is captured into a temporary file, validated, and atomically
renamed. A failed job preserves an existing destination image.

Sources can be local files, inline code, or editor share URLs:

```ts
type OgSketchSource =
	| { kind: 'file'; path: string }
	| { kind: 'code'; code: string; assetRoot?: string }
	| { kind: 'editor-share-url'; url: string };
```

Gallery jobs default to frame `60` and darken `55`; main jobs default to frame
`60` and darken `70`. Frames range from `1` through `1000`, and darken values
from `0` through `100`.

## Branding

Fonts, colors, dimensions, and layout geometry are fixed. A logo and label text
can be overridden:

```json
{
	"logoPath": "./logo.svg",
	"labels": {
		"brandName": "example.art",
		"galleryBadge": "FEATURED SKETCH",
		"galleryAuthorPrefix": "made by",
		"mainTopRight": "FREE + OPEN SOURCE",
		"mainHeadlinePrefix": "CREATE",
		"mainHeadlineEmphasis": "TEXTMODE",
		"mainHeadlineSecondLine": "IN YOUR BROWSER",
		"mainBottomLeft": "LIVE CODE / CHARACTER GRAPHICS",
		"mainBottomRight": "BROWSER-BASED / TEXTMODE.JS"
	}
}
```

Pass the JSON to the CLI with `--branding`. Its `logoPath` is resolved relative
to the JSON file. Imported `logoPath` values are resolved from
`process.cwd()`. Logos must be SVG files with a `viewBox`.

## Security

Sketches execute as browser JavaScript without Node access. The local asset
server is read-only and prevents access outside the configured asset root.
Sketches may still make network requests, so generate images only from code
you trust to access the network.

## License

`@textmode/og` is licensed under the [AGPL-3.0 License](./LICENSE).
