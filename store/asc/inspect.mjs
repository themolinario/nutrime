import { api, APP_ID } from './client.mjs';
const v = await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?limit=5`);
for (const x of v.data) console.log('version', x.id, x.attributes.versionString, x.attributes.appStoreState, x.attributes.platform);
const b = await api('GET', `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=3`);
for (const x of b.data) console.log('build', x.id, x.attributes.version, x.attributes.processingState, x.attributes.uploadedDate);
const live = v.data[0];
const loc = await api('GET', `/v1/appStoreVersions/${live.id}/appStoreVersionLocalizations`);
for (const l of loc.data) {
  console.log('loc', l.id, l.attributes.locale);
  const sets = await api('GET', `/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets`);
  for (const s of sets.data) console.log('  shots', s.attributes.screenshotDisplayType);
  const prev = await api('GET', `/v1/appStoreVersionLocalizations/${l.id}/appPreviewSets`);
  for (const s of prev.data) console.log('  previews', s.attributes.previewType);
}
