/** Escapes text for interpolation into the exported HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * A printable A4 page in NutriMy's palette. Every export shares this shell so
 * the PDFs read as one family; each adds its own body and a few rules.
 */
export function pdfPage(title: string, subtitle: string, body: string, css = ''): string {
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, sans-serif; color: #1B241E; margin: 0; }
  header { border-bottom: 2px solid #1F6B4A; padding-bottom: 10px; margin-bottom: 18px; }
  .brand { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #1F6B4A; font-weight: 600; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; margin: 4px 0 0; }
  .subtitle { color: #6E7C72; font-size: 13px; margin-top: 4px; }
  footer { margin-top: 22px; color: #9BA79F; font-size: 10px; text-align: center; }
  ${css}
</style></head>
<body>
  <header><div class="brand">NutriMy</div><h1>${esc(title)}</h1>${
    subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''
  }</header>
  ${body}
  <footer>Preparato con NutriMy</footer>
</body></html>`;
}
