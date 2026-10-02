// Builds assets/pdfjs/reader.html: a single self-contained page that extracts
// positioned text from a PDF with no network access and no worker file.
//
// pdf.js and its worker are bundled together and the worker is registered on
// `globalThis.pdfjsWorker`, which makes pdf.js run it on the main thread.
// Inlining the bundle keeps the reader to one asset the app can load as a string,
// so it needs no file:// read permissions on either platform.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const entrySource = `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
globalThis.pdfjsWorker = pdfjsWorker;
globalThis.pdfjsLib = pdfjsLib;
`;

const entry = path.join('scripts', '.pdfjs-entry.mjs');
fs.writeFileSync(entry, entrySource);

const result = await build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['safari15'],
  legalComments: 'none',
  write: false,
  outfile: 'pdfjs.bundle.js',
});
fs.unlinkSync(entry);

const bundle = result.outputFiles[0].text;
if (bundle.includes('</script')) throw new Error('bundle would close the inline script tag');

const template = fs.readFileSync('scripts/reader-template.html', 'utf8');
if (!template.includes('/*__PDFJS_BUNDLE__*/')) throw new Error('template placeholder missing');

const html = template.replace('/*__PDFJS_BUNDLE__*/', () => bundle);
fs.mkdirSync('assets/pdfjs', { recursive: true });
fs.writeFileSync('assets/pdfjs/reader.html', html);

console.log(`assets/pdfjs/reader.html — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
