import { addDays, weekdayOf } from '../dates';
import type { HistoryDay } from '../history';
import { historyStats } from '../history';
import { celebrationFor, plantStatus, stageOf } from '../plant';

const TODAY = '2026-10-01'; // a Thursday

/**
 * A history from a pattern read oldest → today: `x` complete, `.` missed,
 * `-` nothing tracked (today still in progress, or a rest day).
 */
function days(pattern: string): HistoryDay[] {
  return [...pattern].flatMap((c, i) => {
    if (c === '-') return [];
    const date = addDays(TODAY, i - pattern.length + 1);
    return [{ date, meals: [], done: c === 'x' ? 1 : 0, total: 1 }];
  });
}

describe('plantStatus', () => {
  it('counts complete days in a row, today included', () => {
    expect(plantStatus(days('xxx'), TODAY)).toEqual({ streak: 3, dry: false, doneToday: true });
  });

  it('does not count today as missed while it is in progress', () => {
    expect(plantStatus(days('xxx-'), TODAY)).toEqual({ streak: 3, dry: false, doneToday: false });
  });

  it('forgives one missed day, and the plant is dry until today is completed', () => {
    expect(plantStatus(days('xxx.-'), TODAY)).toEqual({ streak: 3, dry: true, doneToday: false });
    expect(plantStatus(days('xxx.x'), TODAY)).toEqual({ streak: 4, dry: false, doneToday: true });
  });

  it('starts over after two missed days in a row', () => {
    expect(plantStatus(days('xxx..-'), TODAY).streak).toBe(0);
    expect(plantStatus(days('xxx..x'), TODAY).streak).toBe(1);
  });

  it('skips the days the plan leaves nothing to tick', () => {
    const sunday = (date: string) => weekdayOf(date) === 7;
    // Fri done, Sat missed, Sun rest, Mon–Thu done: a single miss, so the series holds.
    const history = days('x..xxxx').filter((d) => d.date !== '2026-09-27');
    expect(plantStatus(history, TODAY, sunday).streak).toBe(5);
    // Without the rest day, Sat + Sun are two misses and the series breaks.
    expect(plantStatus(history, TODAY).streak).toBe(4);
  });

  it('terminates on a plan made only of rest days', () => {
    expect(plantStatus([], TODAY, () => true).streak).toBe(0);
  });
});

describe('celebrationFor', () => {
  it('plants a seed on the first day', () => {
    const c = celebrationFor(days('x'), TODAY);
    expect(c).toMatchObject({ streak: 1, from: 0, to: 1, revive: false, lit: false, special: null });
    expect(c.title).toBe('Seme piantato!');
  });

  it('blooms on the fifth day and lights up from the sixth', () => {
    expect(celebrationFor(days('xxxxx'), TODAY)).toMatchObject({ from: 4, to: 5, lit: false });
    expect(celebrationFor(days('xxxxxx'), TODAY)).toMatchObject({ from: 5, to: 5, lit: true, special: null });
  });

  it('puts on a different show every five days, in turn', () => {
    const show = (n: number) => celebrationFor(days('x'.repeat(n)), TODAY).special;
    expect([10, 15, 20, 25, 30].map(show)).toEqual([
      'butterflies',
      'fruits',
      'rainbow',
      'stars',
      'butterflies',
    ]);
  });

  it('revives a dry plant and tells a restart from a first start', () => {
    expect(celebrationFor(days('xxx.x'), TODAY)).toMatchObject({ revive: true, streak: 4 });
    expect(celebrationFor(days('xxx..x'), TODAY).title).toBe('Si riparte!');
  });

  it('uses icons, never emoji, in its texts', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 10, 15, 20, 25]) {
      const c = celebrationFor(days('x'.repeat(n)), TODAY);
      expect(`${c.title} ${c.subtitle}`).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(c.icon).toBeTruthy();
    }
  });
});

describe('stageOf', () => {
  it('grows up to the flower and stays there', () => {
    expect([0, 1, 3, 5, 6, 40].map(stageOf)).toEqual([0, 1, 3, 5, 5, 5]);
  });
});

describe('historyStats', () => {
  it('shares the streak rule with the plant', () => {
    expect(historyStats(days('xxx.x'), TODAY).streak).toBe(4);
  });
});
