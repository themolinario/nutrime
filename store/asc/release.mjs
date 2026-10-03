// Prepares a new App Store version and sends it to App Review, through the
// App Store Connect API: version + build, Italian texts from store/README.md,
// screenshots from store/screenshots-v2 and the preview video.
//
//   node store/asc/release.mjs <version> <build number> [--submit] [--skip-media] [--skip-video]
//
// Without --submit everything is uploaded but nothing is sent to review;
// --skip-media keeps the screenshots and videos already uploaded, --skip-video
// only the videos.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { api, APP_ID } from './client.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const store = path.join(here, '..');
const [versionString, buildNumber] = process.argv.slice(2);
const submit = process.argv.includes('--submit');
const skipMedia = process.argv.includes('--skip-media');
const skipVideo = skipMedia || process.argv.includes('--skip-video');
if (!versionString || !buildNumber) throw new Error('Uso: release.mjs <versione> <build> [--submit]');

const SCREENSHOTS = {
  APP_IPHONE_67: 'iphone-6.9',
  APP_IPHONE_65: 'iphone-6.5',
  APP_IPAD_PRO_3GEN_129: 'ipad-13',
};
const VIDEO = path.join(store, 'marketing/video/out/preview-iphone.mp4');
// The sample diet (fictitious patient) App Review needs to try the app.
const REVIEW_PDF = path.join(store, 'review/Dieta di esempio - NutriMy.pdf');
const PREVIEWS = ['IPHONE_67', 'IPHONE_65'];
// The bloomed plant, a good cover frame for the video.
const POSTER = '00:00:06:00';

/* Texts, straight from the README so there's one source */
const readme = fs.readFileSync(path.join(store, 'README.md'), 'utf8');
const block = (heading) => {
  const from = readme.indexOf(heading);
  const start = readme.indexOf('```', from) + 3;
  return readme.slice(readme.indexOf('\n', start) + 1, readme.indexOf('```', start)).trim();
};
const texts = {
  description: block('### Descrizione (4000)'),
  keywords: block('### Parole chiave (100)'),
  whatsNew: block(`Versione ${versionString}:`),
  promotionalText: block('### Testo promozionale (170)'),
};

const log = (...a) => console.log('·', ...a);
const all = async (url) => (await api('GET', url)).data;

/* 1 · Version and build */
let version = (await all(`/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${versionString}&filter[platform]=IOS`))[0];
if (!version) {
  version = (await api('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  })).data;
  log('versione creata', versionString);
} else log('versione esistente', versionString, version.attributes.appStoreState);

const build = (await all(`/v1/builds?filter[app]=${APP_ID}&filter[version]=${buildNumber}&filter[preReleaseVersion.version]=${versionString}`))[0];
if (!build) throw new Error(`Build ${buildNumber} della ${versionString} non trovata`);
if (build.attributes.processingState !== 'VALID') throw new Error(`Build ancora in elaborazione: ${build.attributes.processingState}`);
await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: build.id } });
log('build collegata', buildNumber);

/* 2 · Italian texts */
const loc = (await all(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).find((l) => l.attributes.locale === 'it');
await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
  data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: texts },
});
log('testi aggiornati', Object.keys(texts).join(', '));

/* 3 · Uploads (screenshots and previews share the same reservation flow) */
async function upload(kind, setKind, setId, file, extra = {}) {
  const bytes = fs.readFileSync(file);
  const created = (await api('POST', `/v1/${kind}`, {
    data: {
      type: kind,
      attributes: { fileName: path.basename(file), fileSize: bytes.length, ...extra },
      relationships: { [setKind]: { data: { type: `${setKind}s`, id: setId } } },
    },
  })).data;
  for (const op of created.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`upload ${file}: ${res.status}`);
  }
  const md5 = crypto.createHash('md5').update(bytes).digest('hex');
  await api('PATCH', `/v1/${kind}/${created.id}`, {
    data: { type: kind, id: created.id, attributes: { uploaded: true, sourceFileChecksum: md5 } },
  });
  return created.id;
}

async function setFor(kind, typeAttr, type) {
  const sets = await all(`/v1/appStoreVersionLocalizations/${loc.id}/${kind}s`);
  const found = sets.find((s) => s.attributes[typeAttr] === type);
  if (found) return found.id;
  return (await api('POST', `/v1/${kind}s`, {
    data: {
      type: `${kind}s`,
      attributes: { [typeAttr]: type },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
    },
  })).data.id;
}

for (const [type, folder] of skipMedia ? [] : Object.entries(SCREENSHOTS)) {
  const setId = await setFor('appScreenshotSet', 'screenshotDisplayType', type);
  for (const old of await all(`/v1/appScreenshotSets/${setId}/appScreenshots`)) {
    await api('DELETE', `/v1/appScreenshots/${old.id}`);
  }
  const dir = path.join(store, 'screenshots-v2', folder);
  const ids = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
    ids.push(await upload('appScreenshots', 'appScreenshotSet', setId, path.join(dir, file)));
  }
  await api('PATCH', `/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, {
    data: ids.map((id) => ({ type: 'appScreenshots', id })),
  });
  log('screenshot', type, ids.length);
}

for (const type of skipVideo ? [] : PREVIEWS) {
  const setId = await setFor('appPreviewSet', 'previewType', type);
  for (const old of await all(`/v1/appPreviewSets/${setId}/appPreviews`)) {
    await api('DELETE', `/v1/appPreviews/${old.id}`);
  }
  await upload('appPreviews', 'appPreviewSet', setId, VIDEO, { mimeType: 'video/mp4', previewFrameTimeCode: POSTER });
  log('video', type);
}

/* 4 · Wait for Apple to process the media */
for (let i = 0; i < 90; i++) {
  const pending = [];
  for (const type of Object.keys(SCREENSHOTS)) {
    const setId = await setFor('appScreenshotSet', 'screenshotDisplayType', type);
    for (const s of await all(`/v1/appScreenshotSets/${setId}/appScreenshots`)) {
      const state = s.attributes.assetDeliveryState?.state;
      if (state === 'FAILED') throw new Error(`screenshot rifiutato: ${JSON.stringify(s.attributes.assetDeliveryState)}`);
      if (state !== 'COMPLETE') pending.push(`${type} ${state}`);
    }
  }
  for (const type of PREVIEWS) {
    const setId = await setFor('appPreviewSet', 'previewType', type);
    for (const p of await all(`/v1/appPreviewSets/${setId}/appPreviews`)) {
      // Videos are processed twice: the upload, then the encoding.
      for (const key of ['assetDeliveryState', 'videoDeliveryState']) {
        const state = p.attributes[key]?.state;
        if (state === 'FAILED') throw new Error(`video rifiutato: ${JSON.stringify(p.attributes[key])}`);
        if (state !== 'COMPLETE') pending.push(`${type} ${key} ${state}`);
      }
    }
  }
  if (!pending.length) break;
  log('in elaborazione:', pending.length);
  await new Promise((r) => setTimeout(r, 10_000));
}
log('media pronti');

/* 5 · App Review: the sample PDF goes with the review notes */
const detail = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data;
if (!detail) throw new Error('Mancano le informazioni per la revisione (contatti e note)');
const attached = await all(`/v1/appStoreReviewDetails/${detail.id}/appStoreReviewAttachments`);
if (!attached.some((a) => a.attributes.fileName === path.basename(REVIEW_PDF))) {
  await upload('appStoreReviewAttachments', 'appStoreReviewDetail', detail.id, REVIEW_PDF);
  log('allegato per la revisione', path.basename(REVIEW_PDF));
}

if (!submit) {
  console.log('✓ Pronta. Rilancia con --submit per inviarla in revisione.');
} else {
  const open = (await all(`/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW`))[0];
  const submission = open ?? (await api('POST', '/v1/reviewSubmissions', {
    data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
  })).data;
  const items = await all(`/v1/reviewSubmissions/${submission.id}/items`);
  if (!items.length) {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
        },
      },
    });
  }
  await api('PATCH', `/v1/reviewSubmissions/${submission.id}`, {
    data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } },
  });
  console.log(`✓ ${versionString} (${buildNumber}) inviata in revisione`);
}
