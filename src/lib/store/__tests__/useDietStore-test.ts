import { mealsForDate, parseDietPages } from '../../diet/parse';
import pagesJson from '../../diet/__tests__/fixtures/sample-pages.json';
import type { PdfPage } from '../../pdf/types';
import { EMPTY_GARDEN } from '../../garden';
import { backupOf, dayProgress, extrasOf, useDietStore } from '../useDietStore';

const TUESDAY = '2026-09-29';
const plan = parseDietPages(pagesJson as PdfPage[], 'Dieta.pdf');
const store = () => useDietStore.getState();
const progress = (date: string) => {
  const s = store();
  return dayProgress(mealsForDate(s.plan!, date), s.choices[date], s.eaten[date], extrasOf(s, date));
};

beforeEach(() => {
  store().setPlan(plan);
  store().autoFill([TUESDAY]);
});

describe('autoFill', () => {
  it('fills every table of the day', () => {
    const { total, chosen, done } = progress(TUESDAY);
    expect(total).toBe(12);
    expect(chosen).toBe(total);
    expect(done).toBe(0);
  });
});

describe('setMealEaten', () => {
  it('ticks the whole meal in one go, and unticks it', () => {
    store().setMealEaten(TUESDAY, 'colazione', true);
    expect(progress(TUESDAY).done).toBe(3);

    store().setMealEaten(TUESDAY, 'colazione', false);
    expect(progress(TUESDAY).done).toBe(0);
  });

  it('leaves the tables still to choose alone', () => {
    store().clearChoice(TUESDAY, 'colazione', mealsForDate(plan, TUESDAY)[0].categories[0].id);
    store().setMealEaten(TUESDAY, 'colazione', true);
    expect(progress(TUESDAY).done).toBe(2);
  });

  it('completes the day once every meal is ticked', () => {
    for (const meal of mealsForDate(plan, TUESDAY)) store().setMealEaten(TUESDAY, meal.key, true);
    const { total, done } = progress(TUESDAY);
    expect(done).toBe(total);
  });
});

describe('weights', () => {
  it('records, replaces and removes one reading per day', () => {
    store().setWeight(TUESDAY, 76.1);
    store().setWeight(TUESDAY, 76.3);
    expect(store().weights).toMatchObject({ [TUESDAY]: 76.3 });

    store().setWeight(TUESDAY, null);
    expect(store().weights[TUESDAY]).toBeUndefined();
  });

  it('keeps the readings when a new plan is imported', () => {
    store().setWeight(TUESDAY, 76.1);
    store().setPlan(plan);
    expect(store().weights[TUESDAY]).toBe(76.1);
  });
});

describe('garden', () => {
  beforeEach(() => store().restoreBackup({ ...backupOf(store()), garden: EMPTY_GARDEN }));

  it('grows one plant at a time and keeps the grown ones, in the backup too', () => {
    store().sow('crescione', TUESDAY);
    store().harvest('2026-10-03');
    expect(store().garden).toEqual({
      growing: null,
      grown: [{ species: 'crescione', on: '2026-10-03' }],
    });
    expect(backupOf(store()).garden).toBe(store().garden);
  });

  it('forgets the plant given up, and harvests nothing without one', () => {
    store().sow('ulivo', TUESDAY);
    store().uproot();
    store().harvest(TUESDAY);
    expect(store().garden).toEqual(EMPTY_GARDEN);
  });
});
