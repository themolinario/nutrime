// Renders the App Store screenshots from template.html.
//
//   node store/marketing/render.mjs
//
// Output in store/screenshots-v2/<size>/0N.png. Uses the Chromium of Playwright's
// cache (any recent build works) through playwright-core.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'screenshots-v2');

const SIZES = {
  'iphone-6.9': [1320, 2868],
  'iphone-6.5': [1284, 2778],
  'ipad-13': [2064, 2752],
};
const PANELS = ['1', '2', '3', '4', '5', '6', '7'];

function findChrome() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  for (const dir of fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(
      cache,
      dir,
      'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    );
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('Nessun Chromium di Playwright trovato');
}

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--allow-file-access-from-files'],
});
for (const [name, [width, height]] of Object.entries(SIZES)) {
  fs.mkdirSync(path.join(out, name), { recursive: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  for (const panel of PANELS) {
    const url = `${pathToFileURL(path.join(here, 'template.html'))}?panel=${panel}`;
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, name, `0${panel}.png`) });
  }
  await page.close();
  console.log(`✓ ${name}`);
}
await browser.close();
