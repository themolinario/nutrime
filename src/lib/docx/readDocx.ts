import { strFromU8, unzipSync } from 'fflate';

/*
 * Minimal reader for Word documents (.docx): a zip whose `word/document.xml`
 * holds the body. We only need the reading order of paragraphs and tables, and
 * the text of each table cell, so a small tokenizer beats pulling in a full XML
 * parser (React Native has no DOMParser).
 */

/** A table cell: its paragraphs, each already split on manual line breaks. */
export type DocxCell = string[];
export type DocxBlock = { type: 'paragraph'; text: string } | { type: 'table'; rows: DocxCell[][] };

/** True when the bytes are a zip, which is what a .docx is. */
export function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** True for the old binary Word format (.doc), which we cannot read. */
export function isLegacyWord(bytes: Uint8Array): boolean {
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return ole.every((b, i) => bytes[i] === b);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code] ?? whole;
  });
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Walks `document.xml` once. Paragraphs outside tables become blocks; inside a
 * table they fill the current cell. Nested tables are flattened into their cell.
 */
export function readDocumentXml(xml: string): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const tables: { rows: DocxCell[][] }[] = [];
  let paragraph: string[] | null = null; // parts separated by <w:br/>
  let inText = false;

  const token = /<(\/?)(w:[A-Za-z]+)\b[^>]*?(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(xml))) {
    const [, closing, tag, selfClosing, text] = match;
    const table = tables[tables.length - 1];
    if (text !== undefined) {
      if (inText && paragraph) paragraph[paragraph.length - 1] += decode(text);
      continue;
    }
    switch (tag) {
      case 'w:tbl':
        if (closing) {
          const done = tables.pop()!;
          const outer = tables[tables.length - 1];
          if (outer) {
            // A nested table: keep its text in the enclosing cell.
            const cell = outer.rows.at(-1)?.at(-1);
            if (cell) for (const row of done.rows) for (const c of row) cell.push(...c);
          } else {
            blocks.push({ type: 'table', rows: done.rows });
          }
        } else if (!selfClosing) {
          tables.push({ rows: [] });
        }
        break;
      case 'w:tr':
        if (!closing && table) table.rows.push([]);
        break;
      case 'w:tc':
        if (!closing && table) table.rows.at(-1)?.push([]);
        break;
      case 'w:p':
        if (selfClosing) break;
        if (!closing) {
          paragraph = [''];
        } else if (paragraph) {
          const parts = paragraph.map(clean).filter(Boolean);
          const cell = table?.rows.at(-1)?.at(-1);
          if (cell) cell.push(...parts);
          else if (parts.length) blocks.push({ type: 'paragraph', text: parts.join(' ') });
          paragraph = null;
        }
        break;
      case 'w:t':
        inText = !closing && !selfClosing;
        break;
      case 'w:br':
      case 'w:cr':
        paragraph?.push('');
        break;
      case 'w:tab':
        if (paragraph) paragraph[paragraph.length - 1] += ' ';
        break;
    }
  }
  return blocks;
}

/** Reads the body of a .docx given as bytes. */
export function readDocx(bytes: Uint8Array): DocxBlock[] {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('Il file Word non contiene un documento leggibile.');
  return readDocumentXml(strFromU8(xml));
}
