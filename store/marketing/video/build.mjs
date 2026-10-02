// Builds the App Store preview video (886×1920, 30 fps, ≤ 30 s) from the clips
// recorded with record.sh. Every frame is composed in video.html: animated
// backgrounds and captions, a phone that moves (enters, sways, pushes in on what
// matters), chips popping over it. The recordings are cut down to their actions,
// and scenes are joined with varied transitions.
//
//   node store/marketing/icons.mjs        # once, or when the icon list changes
//   node store/marketing/video/build.mjs
//
// Output: store/marketing/video/out/preview-iphone.mp4
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(here, 'work');
const out = path.join(here, 'out');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(out, { recursive: true });

import { FPS, H, INTRO, OUTRO, SCENES, TRANSITIONS, W, XF } from './config.mjs';

function findChrome() {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  for (const dir of fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('Nessun Chromium di Playwright trovato');
}

const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const pad = (i) => String(i).padStart(3, '0');

/* 1 · The useful moments of each recording, retimed to its scene, as frames */
for (const s of SCENES) {
  const length = s.cuts.reduce((n, [a, b]) => n + b - a, 0);
  const dir = path.join(work, `screen-${s.id}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  const trims = s.cuts.map(([a, b], i) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[c${i}];`).join('');
  ffmpeg([
    '-i', path.join(here, 'clips', s.file),
    '-filter_complex',
    `${trims}${s.cuts.map((_, i) => `[c${i}]`).join('')}concat=n=${s.cuts.length}:v=1:a=0[raw];` +
      `[raw]setpts=(PTS-STARTPTS)/${(length / s.dur).toFixed(4)},fps=${FPS},scale=620:1347[v]`,
    '-map', '[v]', '-frames:v', `${Math.round(s.dur * FPS)}`, '-q:v', '2', path.join(dir, '%03d.jpg'),
  ]);
  s.speed = length / s.dur;
}
console.log('✓ registrazioni');

/* 2 · Every frame composed in video.html: animated background, moving phone, chips */
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const load = async (query) => {
  await page.goto(`${pathToFileURL(path.join(here, 'video.html'))}?${query}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
};
const render = async (query, name, seconds, screens) => {
  const dir = path.join(work, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  await load(query);
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i++) {
    if (screens) {
      // Screens are 1-based; a short recording holds its last frame.
      const n = Math.min(i + 1, fs.readdirSync(screens).length);
      await page.evaluate(([t, src]) => window.frame(t, src), [i / FPS, pathToFileURL(path.join(screens, `${pad(n)}.jpg`)).href]);
    } else {
      await page.evaluate((t) => window.seek(t), i / FPS);
    }
    await page.screenshot({ path: path.join(dir, `${pad(i)}.png`) });
  }
  const file = path.join(work, `${name}.mp4`);
  ffmpeg(['-framerate', `${FPS}`, '-i', path.join(dir, '%03d.png'), '-t', `${seconds}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', file]);
  return file;
};

const parts = [await render('mode=intro', 'intro', INTRO)];
for (const s of SCENES) {
  const cfg = JSON.stringify({ dur: s.dur, zoom: s.zoom, focus: s.focus, from: s.from, tilt: s.tilt, pop: !!s.pop });
  parts.push(await render(`mode=scene&scene=${s.id}&cfg=${encodeURIComponent(cfg)}`, `scene-${s.id}`, s.dur, path.join(work, `screen-${s.id}`)));
  console.log(`✓ scena ${s.id} (registrazione ×${s.speed.toFixed(2)})`);
}
parts.push(await render('mode=outro', 'outro', OUTRO));
await browser.close();

/* 3 · Transitions, silent stereo track, final encode */
const durations = [INTRO, ...SCENES.map((s) => s.dur), OUTRO];
let chain = '';
let label = '0:v';
let offset = 0;
for (let i = 1; i < parts.length; i++) {
  offset += durations[i - 1] - XF;
  const next = `x${i}`;
  chain += `[${label}][${i}:v]xfade=transition=${TRANSITIONS[i - 1]}:duration=${XF}:offset=${offset.toFixed(3)}[${next}];`;
  label = next;
}
const total = durations.reduce((a, b) => a + b, 0) - XF * (parts.length - 1);

const final = path.join(out, 'preview-iphone.mp4');
ffmpeg([
  ...parts.flatMap((p) => ['-i', p]),
  '-f', 'lavfi', '-t', `${total}`, '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-filter_complex', `${chain}[${label}]format=yuv420p[v]`,
  '-map', '[v]', '-map', `${parts.length}:a`,
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-r', `${FPS}`, '-b:v', '10M', '-maxrate', '12M', '-bufsize', '20M',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final,
]);
console.log(`✓ ${path.relative(process.cwd(), final)} · ${total.toFixed(1)} s`);
