import fs from 'node:fs';
import path from 'node:path';
import { parseDietPages, mealsForWeekday } from '../src/lib/diet/parse';
import { WEEKDAY_LABELS } from '../src/lib/diet/text';
import type { PdfPage } from '../src/lib/pdf/types';

const file = process.argv[2] ?? path.join(__dirname, 'fixture-pages.json');
const pages: PdfPage[] = JSON.parse(fs.readFileSync(file, 'utf8'));
const plan = parseDietPages(pages, path.basename(file));

console.log('PAZIENTE :', plan.patient.name, '|', plan.patient.professional, '|', plan.patient.visitDate);
console.log('DETTAGLI :', plan.patient.details.map((d) => `${d.label}=${d.value}`).join('  '));
console.log('WARNINGS :', plan.warnings.length ? plan.warnings : 'nessuno');
console.log('PASTI    :', plan.meals.map((m) => `${m.name}(${m.variants.length})`).join(', '));
console.log();

for (const meal of plan.meals) {
  for (const v of meal.variants) {
    console.log(`── ${meal.name} · ${v.daysLabel} [${v.days.join(',')}]${v.free ? ' · LIBERO' : ''}`);
    for (const c of v.categories) {
      console.log(`     ▸ ${c.name}${c.section ? ` <${c.section}>` : ''} (${c.options.length})`);
      for (const o of c.options) {
        const comp = o.components?.length ? `  {${o.components.map((x) => `${x.name} ${x.qty.raw}`).join(' | ')}}` : '';
        console.log(`         · ${o.name} — ${o.qty.raw}${comp}`);
      }
    }
  }
}

console.log('\n════════ GIORNI ════════');
for (let d = 1; d <= 7; d++) {
  const meals = mealsForWeekday(plan, d);
  const cats = meals.reduce((a, m) => a + m.categories.length, 0);
  console.log(
    `${WEEKDAY_LABELS[d - 1].padEnd(10)} ${meals.length} pasti, ${cats} scelte: ` +
      meals.map((m) => `${m.name}${m.free ? '(libero)' : `[${m.categories.map((c) => c.name).join('/')}]`}`).join(' · '),
  );
}
