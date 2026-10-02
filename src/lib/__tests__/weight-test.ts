import {
  entriesInRange,
  formatDelta,
  formatKg,
  parseKg,
  WEIGHT_RANGES,
  weightEntries,
  weightOn,
} from '../weight';

describe('parseKg', () => {
  it('reads Italian and English decimals, rounding to 100 g', () => {
    expect(parseKg('72,4')).toBe(72.4);
    expect(parseKg(' 72.46 ')).toBe(72.5);
    expect(parseKg('80')).toBe(80);
  });

  it('refuses what is not an adult weight', () => {
    expect(parseKg('')).toBeNull();
    expect(parseKg('abc')).toBeNull();
    expect(parseKg('12')).toBeNull();
    expect(parseKg('400')).toBeNull();
  });
});

describe('formatting', () => {
  it('writes kilos the Italian way', () => {
    expect(formatKg(72.4)).toBe('72,4');
    expect(formatKg(70)).toBe('70,0');
  });

  it('signs changes, with a real minus', () => {
    expect(formatDelta(0.4)).toBe('+0,4');
    expect(formatDelta(-1.26)).toBe('−1,3');
    expect(formatDelta(0.01)).toBe('0,0');
  });
});

describe('readings', () => {
  const weights = { '2026-09-28': 76.1, '2026-08-01': 79, '2026-10-01': 75.8 };
  const entries = weightEntries(weights);

  it('sorts readings oldest first', () => {
    expect(entries.map((e) => e.date)).toEqual(['2026-08-01', '2026-09-28', '2026-10-01']);
  });

  it('finds the reading of a day, or the last one before it', () => {
    expect(weightOn(entries, '2026-10-01')?.kg).toBe(75.8);
    expect(weightOn(entries, '2026-09-30')?.kg).toBe(76.1);
    expect(weightOn(entries, '2026-07-01')).toBeUndefined();
  });

  it('keeps only the readings of the chosen range', () => {
    const month = WEIGHT_RANGES.find((r) => r.key === '1m')!;
    const all = WEIGHT_RANGES.find((r) => r.key === 'all')!;
    expect(entriesInRange(entries, month, '2026-10-01').map((e) => e.date)).toEqual([
      '2026-09-28',
      '2026-10-01',
    ]);
    expect(entriesInRange(entries, all, '2026-10-01')).toHaveLength(3);
  });
});
