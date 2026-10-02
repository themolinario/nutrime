// Renders the Google Play graphics: phone screenshots (template.html with the
// Android phone and the screens in raw-android/) and the 1024×500 feature graphic.
//
//   node store/marketing/play.mjs
//
// Output in store/play/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'play');
const PANELS = ['1', '2', '3', '4', '5', '6', '7'];

function findChrome() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  for (const dir of fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('Nessun Chromium di Playwright trovato');
}

const browser = await chromium.launch({ executablePath: findChrome(), args: ['--allow-file-access-from-files'] });
const shoot = async (file, width, height, query, target) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(path.join(here, file))}?${query}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target });
  await page.close();
};
for (const panel of PANELS) {
  await shoot('template.html', 1080, 2160, `panel=${panel}&device=android`, path.join(out, 'phone', `0${panel}.png`));
}
console.log('✓ screenshot telefono');
await shoot('feature.html', 1024, 500, '', path.join(out, 'feature-graphic.png'));
console.log('✓ grafica in evidenza');
await browser.close();
