import { addDays, weekdayOf } from '../dates';
import type { HistoryDay } from '../history';
import { historyStats } from '../history';
import { growOf, missingFor, speciesOf, SPECIES, type Garden } from '../garden';
import { celebrationFor, growingStatus, plantStatus } from '../plant';

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

const SINCE = addDays(TODAY, -120);
const sunflower = { species: 'girasole', since: SINCE } as const; // 21 days

describe('celebrationFor', () => {
  it('plants a seed on the first day', () => {
    const c = celebrationFor(days('x'), TODAY, sunflower);
    expect(c).toMatchObject({ progress: 1, goal: 21, from: 0, to: 1, revive: false, grown: false });
    expect(c.title).toBe('Seme piantato!');
  });

  it('grows a little every day and shows the bud on the day before the end', () => {
    const grows = [1, 2, 10, 20].map((n) => celebrationFor(days('x'.repeat(n)), TODAY, sunflower).to);
    expect(grows[0]).toBe(1);
    expect(grows[1]).toBeGreaterThan(1);
    expect(grows[2]).toBeGreaterThan(grows[1]);
    expect(grows[3]).toBe(4);
  });

  it('is grown on its last day, with its own show', () => {
    const c = celebrationFor(days('x'.repeat(21)), TODAY, sunflower);
    expect(c).toMatchObject({ progress: 21, from: 4, to: 5, grown: true, special: 'rainbow' });
    expect(c.title).toBe('Il girasole è sbocciato!');
  });

  it('counts only the days since the plant was sown', () => {
    const sown = { species: 'crescione', since: addDays(TODAY, -1) } as const;
    expect(celebrationFor(days('xxxxxxxx'), TODAY, sown)).toMatchObject({ progress: 2, goal: 5 });
  });

  it('revives a dry plant and tells a restart from a first start', () => {
    expect(celebrationFor(days('xxx.x'), TODAY, sunflower)).toMatchObject({ revive: true, progress: 4 });
    expect(celebrationFor(days('xxx..x'), TODAY, sunflower).title).toBe('Si riparte!');
  });

  it('uses icons, never emoji, in its texts', () => {
    for (const species of SPECIES) {
      for (const n of [1, 2, species.days - 1, species.days]) {
        const c = celebrationFor(days('x'.repeat(n)), TODAY, { species: species.id, since: SINCE });
        expect(`${c.title} ${c.subtitle}`).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(c.icon).toBeTruthy();
      }
    }
  });
});

describe('growingStatus', () => {
  it('is ready once the days are reached, and never counts past them', () => {
    const cress = { species: 'crescione', since: SINCE } as const;
    expect(growingStatus(days('xxxx-'), TODAY, cress)).toMatchObject({ progress: 4, ready: false });
    expect(growingStatus(days('x'.repeat(9)), TODAY, cress)).toMatchObject({
      progress: 5,
      grow: 5,
      ready: true,
    });
  });

  it('waits for a seed sown for tomorrow', () => {
    const tomorrow = { species: 'crescione', since: addDays(TODAY, 1) } as const;
    expect(growingStatus(days('xxx'), TODAY, tomorrow)).toMatchObject({ progress: 0, grow: 0 });
  });
});

describe('growOf', () => {
  it('goes from bare soil to grown, with the bud on the last day before', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => growOf(n, 5))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(growOf(59, 60)).toBe(4);
    expect(growOf(60, 60)).toBe(5);
  });
});

describe('the catalogue', () => {
  it('has ten plants, the longest of 60 days, unlocked by the 30-day one', () => {
    expect(SPECIES).toHaveLength(10);
    const longest = SPECIES.reduce((a, b) => (b.days > a.days ? b : a));
    expect(longest.days).toBe(60);
    expect(longest.requires.map((id) => speciesOf(id).days)).toEqual([30]);
  });

  it('only asks for shorter plants first, so every plant can be reached', () => {
    for (const s of SPECIES) {
      for (const id of s.requires) expect(speciesOf(id).days).toBeLessThan(s.days);
    }
  });

  it('unlocks a plant once what it needs is in the greenhouse', () => {
    const tomato = speciesOf('pomodoro');
    const half: Garden = { growing: null, grown: [{ species: 'fragola', on: TODAY }] };
    expect(missingFor(tomato, half).map((s) => s.id)).toEqual(['peperoncino']);
    const both: Garden = { ...half, grown: [...half.grown, { species: 'peperoncino', on: TODAY }] };
    expect(missingFor(tomato, both)).toEqual([]);
  });
});

describe('historyStats', () => {
  it('shares the streak rule with the plant', () => {
    expect(historyStats(days('xxx.x'), TODAY).streak).toBe(4);
  });
});
