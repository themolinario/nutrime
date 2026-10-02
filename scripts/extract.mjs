// Dumps positioned text runs from a PDF exactly like the in-app WebView bridge does.
import fs from 'node:fs';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

export async function extract(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: false, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push({
      n: p,
      width: +vp.width.toFixed(2),
      height: +vp.height.toFixed(2),
      items: tc.items
        .filter((i) => i.str && i.str.trim())
        .map((i) => ({
          s: i.str,
          x: +i.transform[4].toFixed(2),
          y: +(vp.height - i.transform[5]).toFixed(2),
          w: +i.width.toFixed(2),
          h: +i.height.toFixed(2),
        })),
    });
  }
  return pages;
}

if (process.argv[2]) {
  const pages = await extract(process.argv[2]);
  fs.writeFileSync(process.argv[3] ?? 'pages.json', JSON.stringify(pages));
  console.log(`pages: ${pages.length}`);
}
