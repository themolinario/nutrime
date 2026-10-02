import type { PdfPage } from '../../pdf/types';
import { hasChoices, mealsForWeekday, parseDietPages } from '../parse';
import pagesJson from './fixtures/sample-pages.json';

/*
 * The sample diet attached for app review (store/review): fictitious patient and
 * nutritionist, real "Progeo Medical" layout. Pages extracted with
 * scripts/extract.mjs, the same way the app's PDF reader does.
 */
const pages = pagesJson as PdfPage[];
const plan = parseDietPages(pages, 'Dieta.pdf');

describe('parseDietPages on the sample diet', () => {
  it('reads who the plan is for', () => {
    expect(plan.patient.name).toBe('Mario Rossi');
    expect(plan.patient.professional).toBe('Dott.ssa Bianchi Anna');
    expect(plan.patient.visitDate).toBe('01/09/2026');
    expect(plan.patient.details).toEqual(
      expect.arrayContaining([
        { label: 'Peso', value: 'kg 68,0' },
        { label: 'Altezza', value: 'cm 170' },
      ]),
    );
  });

  it('finds every meal, without warnings', () => {
    expect(plan.warnings).toEqual([]);
    expect(plan.meals.map((m) => m.name)).toEqual([
      'Colazione',
      'Metà mattina',
      'Pranzo',
      'Merenda',
      'Cena',
      'Arco della giornata',
    ]);
  });

  it('resolves the tables of each weekday', () => {
    const choicesPerDay = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      mealsForWeekday(plan, day).reduce((n, m) => n + m.categories.length, 0),
    );
    expect(choicesPerDay).toEqual([16, 12, 16, 13, 15, 9, 13]);
  });

  it('marks Saturday dinner as a free meal', () => {
    const dinner = mealsForWeekday(plan, 6).find((m) => m.key === 'cena');
    expect(dinner?.free).toBe(true);
    expect(dinner?.categories).toHaveLength(0);
  });

  it('keeps quantities with their foods', () => {
    const breakfast = mealsForWeekday(plan, 2).find((m) => m.key === 'colazione')!;
    const cereals = breakfast.categories.find((c) => c.name === 'Derivati dei cereali')!;
    expect(cereals.options.map((o) => [o.name, o.qty.raw])).toEqual(
      expect.arrayContaining([
        ["Fiocchi d'avena", 'g 50'],
        ['Fiocchi di farro', 'g 60'],
      ]),
    );
    expect(hasChoices(mealsForWeekday(plan, 2))).toBe(true);
  });
});
