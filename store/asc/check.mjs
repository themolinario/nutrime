import { api, APP_ID } from './client.mjs';
const v = (await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=1.4.0`)).data[0];
console.log('version', v.attributes.versionString, v.attributes.appStoreState, v.attributes.releaseType);
const loc = (await api('GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data[0];
for (const s of (await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appPreviewSets`)).data) {
  for (const p of (await api('GET', `/v1/appPreviewSets/${s.id}/appPreviews`)).data)
    console.log('preview', s.attributes.previewType, p.attributes.assetDeliveryState?.state, p.attributes.videoDeliveryState?.state ?? '-', p.attributes.previewFrameTimeCode);
}
try {
  const r = await api('GET', `/v1/appStoreVersions/${v.id}/appStoreReviewDetail`);
  const a = r.data?.attributes; console.log('review detail', a ? { contact: a.contactEmail, phone: !!a.contactPhone, demoRequired: a.demoAccountRequired, notes: (a.notes || '').slice(0, 60) } : null);
  if (r.data) { const att = await api('GET', `/v1/appStoreReviewDetails/${r.data.id}/appStoreReviewAttachments`); console.log('attachments', att.data.map((x) => x.attributes.fileName)); }
} catch (e) { console.log('review detail error', e.message.split('\n')[0]); }
const prev = (await api('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=1.3.2`)).data[0];
const r2 = await api('GET', `/v1/appStoreVersions/${prev.id}/appStoreReviewDetail`);
console.log('1.3.2 review detail', r2.data ? Object.keys(r2.data.attributes).filter((k) => r2.data.attributes[k]) : null);
