// Loads the WebView HTML in a real browser engine and checks the extraction
// output matches what the Node reference extractor produces.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { extract } from './extract.mjs';

const pdfPath = process.argv[2];
const dir = path.resolve('assets/pdfjs');
const base64 = fs.readFileSync(pdfPath).toString('base64');

function findChromium() {
  const root = `${process.env.HOME}/Library/Caches/ms-playwright`;
  for (const dir of fs.readdirSync(root).filter((d) => d.startsWith('chromium-'))) {
    for (const app of ['Google Chrome for Testing', 'Chromium']) {
      const exe = `${root}/${dir}/chrome-mac-arm64/${app}.app/Contents/MacOS/${app}`;
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error('no bundled Chromium found');
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
page.on('console', (m) => console.log('  [webview]', m.text()));
page.on('pageerror', (e) => console.log('  [error]', e.message));

await page.goto(`file://${dir}/reader.html`);
await page.waitForFunction(() => window.__pdfReady === true, null, { timeout: 30000 });

const result = await page.evaluate(async (b64) => window.__extract(b64), base64);
await browser.close();

if (result.error) {
  console.error('FAIL:', result.error);
  process.exit(1);
}

const reference = await extract(pdfPath);
console.log(`webview pages: ${result.pages.length}, items: ${result.pages.reduce((n, p) => n + p.items.length, 0)}`);
console.log(`node    pages: ${reference.length}, items: ${reference.reduce((n, p) => n + p.items.length, 0)}`);

// Both engines round to 2 decimals slightly differently, so compare with a tolerance.
const problems = [];
if (result.pages.length !== reference.length) problems.push('page count differs');
for (let p = 0; p < Math.min(result.pages.length, reference.length); p++) {
  const a = result.pages[p].items;
  const b = reference[p].items;
  if (a.length !== b.length) {
    problems.push(`page ${p + 1}: ${a.length} items vs ${b.length}`);
    continue;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].s !== b[i].s) problems.push(`page ${p + 1} item ${i}: "${a[i].s}" vs "${b[i].s}"`);
    for (const k of ['x', 'y', 'w', 'h']) {
      if (Math.abs(a[i][k] - b[i][k]) > 0.02) {
        problems.push(`page ${p + 1} item ${i} ${k}: ${a[i][k]} vs ${b[i][k]}`);
      }
    }
  }
}

fs.writeFileSync('/tmp/webview.json', JSON.stringify(result.pages));
if (problems.length) {
  console.log(`❌ ${problems.length} differences:`);
  for (const line of problems.slice(0, 10)) console.log('   ' + line);
  process.exit(1);
}
console.log('✅ matches the Node reference extraction (within rounding)');
