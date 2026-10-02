// Adds sound effects to the preview video: a "pop" every time something pops in
// (stickers, chips, the app icon), a whoosh on each transition and a little
// chime when the plant blooms. The sounds are synthesized here, so there are no
// third-party samples to license.
//
//   node store/marketing/video/build.mjs   # the pictures, first
//   node store/marketing/video/audio.mjs
//
// Output: store/marketing/video/out/promo-iphone-audio.mp4 (the App Store
// preview, out/preview-iphone.mp4, stays silent).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';

import { SCENES, partStarts } from './config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RATE = 44100;

/* 1 · When things pop: read straight from the animations of video.html */
function findChrome() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  for (const dir of fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('Nessun Chromium di Playwright trovato');
}
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 886, height: 1920 } });
const popsOf = async (query) => {
  await page.goto(`${pathToFileURL(path.join(here, 'video.html'))}?${query}`);
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => ['pop', 'popin', 'chip'].includes(a.animationName))
      // The pop is heard as the element snaps to full size, a moment after it starts.
      .map((a) => ({ t: a.effect.getTiming().delay / 1000 + 0.12, big: a.animationName !== 'pop' })),
  );
};
const queries = [
  'mode=intro',
  ...SCENES.map((s) => `mode=scene&scene=${s.id}&cfg=${encodeURIComponent(JSON.stringify({ dur: s.dur, zoom: s.zoom, focus: s.focus, from: s.from, tilt: s.tilt, pop: !!s.pop }))}`),
  'mode=outro',
];
const { starts, total } = partStarts();
const events = [];
for (const [i, query] of queries.entries()) {
  for (const p of await popsOf(query)) events.push({ t: starts[i] + p.t, kind: p.big ? 'pop' : 'bubble' });
  if (i > 0) events.push({ t: starts[i] - 0.05, kind: 'whoosh' });
}
await browser.close();
// The plant blooms just under a second into its scene.
events.push({ t: starts[1 + SCENES.findIndex((s) => s.id === 'e')] + 0.9, kind: 'chime' });

/* 2 · Synthesis */
const track = new Float32Array(Math.ceil((total + 0.5) * RATE));
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const add = (at, seconds, sample) => {
  const from = Math.round(at * RATE);
  for (let i = 0; i < seconds * RATE && from + i < track.length; i++) track[from + i] += sample(i / RATE);
};

// A round "pop": a sine that drops in pitch fast, with a soft click on top.
function pop(at, pitch, gain) {
  let phase = 0;
  add(at, 0.18, (t) => {
    phase += (2 * Math.PI * pitch * (0.55 + 0.75 * Math.exp(-t * 38))) / RATE;
    const env = Math.exp(-t * 26) * (1 - Math.exp(-t * 3000));
    const click = t < 0.004 ? (random() * 2 - 1) * (1 - t / 0.004) * 0.35 : 0;
    return gain * (Math.sin(phase) * env + click);
  });
}
// Air going by: noise through a low-pass whose cutoff sweeps up and down.
function whoosh(at) {
  const d = 0.42;
  let low = 0;
  add(at, d, (t) => {
    const x = t / d;
    const cutoff = 400 + 3000 * Math.sin(Math.PI * x);
    low += (1 - Math.exp((-2 * Math.PI * cutoff) / RATE)) * (random() * 2 - 1 - low);
    return 0.22 * low * Math.pow(Math.sin(Math.PI * x), 2);
  });
}
// Three bright bell notes in a quick arpeggio.
function chime(at) {
  [1568, 2093, 2637].forEach((f, i) =>
    add(at + i * 0.07, 1.3, (t) =>
      0.16 * Math.exp(-t * 3.5) * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * t))),
  );
}

for (const e of events.sort((a, b) => a.t - b.t)) {
  if (e.kind === 'whoosh') whoosh(e.t);
  else if (e.kind === 'chime') chime(e.t);
  // Every pop a little different, so a row of them doesn't sound mechanical.
  else pop(e.t, (e.kind === 'pop' ? 520 : 760) * (0.9 + random() * 0.25), e.kind === 'pop' ? 0.55 : 0.4);
}

/* 3 · WAV, then muxed with the existing pictures */
const wav = Buffer.alloc(44 + track.length * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + track.length * 4, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(RATE, 24);
wav.writeUInt32LE(RATE * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(track.length * 4, 40);
track.forEach((v, i) => {
  // Soft limiter, so overlapping sounds never clip.
  const s = Math.round(Math.tanh(v * 1.2) * 32767);
  wav.writeInt16LE(s, 44 + i * 4);
  wav.writeInt16LE(s, 46 + i * 4);
});
const sfx = path.join(here, 'work', 'sfx.wav');
fs.writeFileSync(sfx, wav);

const video = path.join(here, 'out', 'preview-iphone.mp4');
const final = path.join(here, 'out', 'promo-iphone-audio.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', sfx, '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
const count = (k) => events.filter((e) => e.kind === k).length;
console.log(`✓ ${path.relative(process.cwd(), final)} · ${count('pop') + count('bubble')} pop, ${count('whoosh')} transizioni, ${count('chime')} campanelli`);
