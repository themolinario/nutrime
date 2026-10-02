import { isDietFileUrl } from '../useIncomingPdf';
import { redirectSystemPath } from '../../../app/+native-intent';

describe('isDietFileUrl', () => {
  it('accepts PDF and Word files, whatever the case', () => {
    expect(isDietFileUrl('file:///private/var/Inbox/Dieta.PDF')).toBe(true);
    expect(isDietFileUrl('file:///docs/Piano%20alimentare.docx')).toBe(true);
    expect(isDietFileUrl('file:///docs/vecchio.doc?x=1')).toBe(true);
  });

  it("accepts Android's content:// URIs, which carry no extension", () => {
    expect(isDietFileUrl('content://media/external/file/1000000018')).toBe(true);
  });

  it('ignores the app’s own links and other files', () => {
    expect(isDietFileUrl(null)).toBe(false);
    expect(isDietFileUrl('nutrime://oggi')).toBe(false);
    expect(isDietFileUrl('file:///foto.jpg')).toBe(false);
  });
});

describe('redirectSystemPath', () => {
  it('sends files opened with NutriMy to the import screen', () => {
    expect(redirectSystemPath({ path: 'content://media/external/file/18', initial: true })).toBe('/importa');
    expect(redirectSystemPath({ path: 'file:///Inbox/Dieta.pdf', initial: false })).toBe('/importa');
  });

  it('leaves the app’s own links as they are', () => {
    expect(redirectSystemPath({ path: '/giorno/2026-10-01', initial: false })).toBe('/giorno/2026-10-01');
  });
});
