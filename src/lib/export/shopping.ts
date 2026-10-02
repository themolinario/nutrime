import type { ShoppingLine } from '../diet/shopping';
import { esc, pdfPage } from './html';
import { formatRange } from './menu';

export type ShoppingGroup = { aisle: string; lines: ShoppingLine[] };

const AISLE_EMOJI: Record<string, string> = {
  'Aggiunti da te': '✍️',
  'Frutta e verdura': '🥦',
  Carne: '🥩',
  Pesce: '🐟',
  'Latticini e uova': '🧀',
  Salumi: '🥓',
  'Pane e cereali': '🍞',
  Dispensa: '🫙',
  Bevande: '💧',
  Altro: '🛍️',
};

function subtitle(dates: string[], groups: ShoppingGroup[]): string {
  const count = groups.reduce((n, g) => n + g.lines.length, 0);
  return `${formatRange(dates)} · ${dates.length} giorni · ${count} articoli`;
}

/**
 * The list as a chat message: one aisle per block, a box to tick per line, and
 * what is already in the basket struck through (`~text~` in WhatsApp).
 */
export function buildShoppingMessage(
  dates: string[],
  groups: ShoppingGroup[],
  bought: Record<string, boolean>,
): string {
  const body = groups
    .map((group) => {
      const lines = group.lines.map((line) =>
        bought[line.id]
          ? `✅ ~${line.name} — ${line.qtyLabel}~`
          : `☐ ${line.name} — *${line.qtyLabel}*`,
      );
      return `${AISLE_EMOJI[group.aisle] ?? '•'} *${group.aisle.toUpperCase()}*\n${lines.join('\n')}`;
    })
    .join('\n\n');
  return `🛒 *Lista della spesa*\n_${subtitle(dates, groups)}_\n\n${body}`;
}

const SHOPPING_CSS = `
  .columns { column-count: 2; column-gap: 22px; }
  section { break-inside: avoid; margin-bottom: 14px; }
  h2 { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #1F6B4A; margin: 0 0 4px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; border-bottom: 1px solid #E7DFD2; font-size: 13px; }
  .box { flex: none; width: 11px; height: 11px; border: 1.5px solid #9BA79F; border-radius: 3px; position: relative; top: 1px; }
  .done .box { background: #1F6B4A; border-color: #1F6B4A; }
  .name { flex: 1; }
  .times { color: #9BA79F; font-size: 10.5px; }
  .qty { font-weight: 600; color: #1F6B4A; white-space: nowrap; }
  .done .name, .done .qty { color: #9BA79F; text-decoration: line-through; font-weight: 400; }
`;

/** The list as a printable A4 page in two columns, with boxes to tick by pen. */
export function buildShoppingHtml(
  dates: string[],
  groups: ShoppingGroup[],
  bought: Record<string, boolean>,
): string {
  const sections = groups
    .map((group) => {
      const rows = group.lines
        .map(
          (line) =>
            `<li class="${bought[line.id] ? 'done' : ''}"><span class="box"></span><span class="name">${esc(line.name)}${
              line.times > 1 ? ` <span class="times">×${line.times}</span>` : ''
            }</span><span class="qty">${esc(line.qtyLabel)}</span></li>`,
        )
        .join('');
      return `<section><h2>${esc(group.aisle)}</h2><ul>${rows}</ul></section>`;
    })
    .join('');
  return pdfPage(
    'Lista della spesa',
    subtitle(dates, groups),
    `<div class="columns">${sections}</div>`,
    SHOPPING_CSS,
  );
}

export function shoppingPdfName(dates: string[]): string {
  return `Spesa ${formatRange(dates)}.pdf`;
}
