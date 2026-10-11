import { describe, expect, it } from 'vitest';
import {
  localDateStr,
  todayStr,
  formatDate,
  formatDateLabel,
  isValidDateEntry,
  isRealCalendarDate,
  isUsableDateStr,
} from '../src/lib/dates';
import { toWeight } from '../src/lib/format';
import { computeWeightDiffs, progressPct, newWeightId, buildSparkline } from '../src/lib/compute';
import { toSetCount, isExerciseDone, exerciseSets, getExerciseByKey } from '../src/lib/workout';
import type { WeightEntry } from '../src/lib/compute';

describe('localDateStr', () => {
  it('uses local time, no UTC shift', () => {
    expect(localDateStr(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(localDateStr(new Date(2024, 11, 31))).toBe('2024-12-31');
    expect(localDateStr(new Date(2024, 2, 7))).toBe('2024-03-07');
  });
});

describe('todayStr', () => {
  it('returns YYYY-MM-DD matching local date', () => {
    const d = new Date();
    const expected =
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    expect(todayStr()).toBe(expected);
  });
});

describe('formatDate', () => {
  it('produces a non-empty localized string', () => {
    const s = formatDate('2024-03-05');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('formatDateLabel', () => {
  it('distinguishes today/yesterday/other', () => {
    expect(formatDateLabel(todayStr())).toBe('Сьогодні');
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(formatDateLabel(localDateStr(y))).toBe('Вчора');
    const other = formatDateLabel('2020-01-01');
    expect(other).not.toBe('Сьогодні');
    expect(other).not.toBe('Вчора');
  });
});

describe('toWeight', () => {
  it('accepts comma decimals and plain numbers', () => {
    expect(toWeight('0,5')).toBe(0.5);
    expect(toWeight('12')).toBe(12);
    expect(toWeight(' 80.5 ')).toBe(80.5);
    expect(toWeight('2.25')).toBe(2.3);
  });

  it('rejects garbage, negatives, zero, empty, out-of-range, non-decimal', () => {
    expect(toWeight('12abc')).toBeNull();
    expect(toWeight('')).toBeNull();
    expect(toWeight('   ')).toBeNull();
    expect(toWeight('-3')).toBeNull();
    expect(toWeight('0')).toBeNull();
    expect(toWeight('0.4')).toBeNull();
    expect(toWeight('1000')).toBeNull();
    expect(toWeight('1e3')).toBeNull();
    expect(toWeight('0x10')).toBeNull();
    expect(toWeight('Infinity')).toBeNull();
    expect(toWeight('abc')).toBeNull();
    expect(toWeight(null)).toBeNull();
    expect(toWeight(undefined)).toBeNull();
    expect(toWeight(NaN)).toBeNull();
  });

  it('enforces the 0.5–999 domain', () => {
    expect(toWeight('0.5')).toBe(0.5);
    expect(toWeight('999')).toBe(999);
    expect(toWeight('999.9')).toBeNull();
  });

  it('rejects ambiguous thousand separators', () => {
    // LOGIC-002: "1,000" більше не стає 1 кг.
    expect(toWeight('1,000')).toBeNull();
    expect(toWeight('1.000,5')).toBeNull();
    expect(toWeight('1,5,0')).toBeNull();
    expect(toWeight('1,5')).toBe(1.5);
  });
});

describe('computeWeightDiffs', () => {
  const entries = (
    data: Array<{ id: string; date: string; weight: number }>,
  ): WeightEntry[] => data;

  it('uses chronological neighbor, not insertion order', () => {
    const sorted = entries([
      { id: 'c', date: '2024-03-03', weight: 80 },
      { id: 'a', date: '2024-03-01', weight: 82 },
      { id: 'b', date: '2024-02-25', weight: 84 },
    ]);
    expect(computeWeightDiffs(sorted)).toEqual([-2, -2, null]);
  });

  it('handles empty and single-entry lists', () => {
    expect(computeWeightDiffs([])).toEqual([]);
    expect(computeWeightDiffs([{ id: 'a', date: '2024-01-01', weight: 80 }])).toEqual([null]);
  });

  it('rounds to one decimal', () => {
    const sorted = entries([
      { id: 'a', date: '2024-03-02', weight: 80.1 },
      { id: 'b', date: '2024-03-01', weight: 80 },
    ]);
    expect(computeWeightDiffs(sorted)).toEqual([0.1, null]);
  });
});

describe('progressPct', () => {
  it('computes and clamps to 0–100', () => {
    expect(progressPct(5, 10)).toBe(50);
    expect(progressPct(0, 10)).toBe(0);
    expect(progressPct(15, 10)).toBe(100);
    expect(progressPct(-3, 10)).toBe(0);
    expect(progressPct(5, 0)).toBe(0);
    expect(progressPct(NaN, 10)).toBe(0);
  });
});

describe('newWeightId', () => {
  it('returns unique non-empty string ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newWeightId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(typeof id).toBe('string');
  });
});

describe('buildSparkline', () => {
  it('returns null for empty input or degenerate canvas', () => {
    expect(buildSparkline([])).toBeNull();
    expect(buildSparkline([NaN, Infinity])).toBeNull();
    expect(buildSparkline([80, 81], 10, 10, 8)).toBeNull();
  });

  it('places min at the bottom and max at the top of the inner area', () => {
    const s = buildSparkline([80, 90], 300, 84, 8);
    expect(s).not.toBeNull();
    expect(s?.min).toBe(80);
    expect(s?.max).toBe(90);
    expect(s?.line).toBe('M8 76 L292 8');
    expect(s?.last).toEqual({ x: 292, y: 8 });
  });

  it('centers flat series instead of dividing by zero', () => {
    const s = buildSparkline([80, 80, 80], 300, 84, 8);
    expect(s?.line).toBe('M8 42 L150 42 L292 42');
  });

  it('centers a single point and closes the area for multiple points', () => {
    const single = buildSparkline([80], 300, 84, 8);
    expect(single?.line).toBe('M150 42');
    expect(single?.area).toBe('');

    const multi = buildSparkline([80, 81, 82], 300, 84, 8);
    expect(multi?.area.startsWith('M8 76 L150 42 L292 8')).toBe(true);
    expect(multi?.area.endsWith('L292 76 L8 76 Z')).toBe(true);
  });

  it('filters non-finite values before scaling', () => {
    const s = buildSparkline([80, NaN, 90, Infinity], 300, 84, 8);
    expect(s?.line).toBe('M8 76 L292 8');
  });
});

describe('isRealCalendarDate / isUsableDateStr', () => {
  it('accepts real dates, rejects rollover and garbage', () => {
    expect(isRealCalendarDate('2024-02-29')).toBe(true);
    expect(isRealCalendarDate('2024-02-30')).toBe(false);
    expect(isRealCalendarDate('2024-13-01')).toBe(false);
    expect(isRealCalendarDate('garbage')).toBe(false);
    expect(isRealCalendarDate('2024-1-1')).toBe(false);
  });

  it('rejects future dates for usable input', () => {
    expect(isUsableDateStr('2020-01-01')).toBe(true);
    expect(isUsableDateStr('2999-01-01')).toBe(false);
    expect(isUsableDateStr('not-a-date')).toBe(false);
  });
});

describe('isValidDateEntry', () => {
  it('accepts a non-empty object of booleans or positive set counts', () => {
    expect(isValidDateEntry({ 'squat': true, 'bench': false })).toBe(true);
    expect(isValidDateEntry({ 'leg-press': 2 })).toBe(true);
  });

  it('rejects arrays, dates and non-boolean/non-count values', () => {
    expect(isValidDateEntry([])).toBe(false);
    expect(isValidDateEntry(new Date())).toBe(false);
    expect(isValidDateEntry({ 'leg-press': 0 })).toBe(false);
    expect(isValidDateEntry({ 'leg-press': -1 })).toBe(false);
    expect(isValidDateEntry({ 'leg-press': 2.5 })).toBe(false);
    expect(isValidDateEntry({ 'squat': 'yes' })).toBe(false);
    expect(isValidDateEntry({})).toBe(false);
    expect(isValidDateEntry(null)).toBe(false);
    expect(isValidDateEntry(undefined)).toBe(false);
    expect(isValidDateEntry(42)).toBe(false);
  });
});

describe('set counts (workout helpers)', () => {
  it('maps boolean legacy values to the full target', () => {
    expect(toSetCount(true, 'leg-press')).toBe(3);
    expect(toSetCount(true, 'treadmill')).toBe(1);
    expect(toSetCount(false, 'leg-press')).toBe(0);
  });

  it('clamps numbers to the target and rejects junk', () => {
    expect(toSetCount(2, 'leg-press')).toBe(2);
    expect(toSetCount(99, 'leg-press')).toBe(3);
    expect(toSetCount(-1, 'leg-press')).toBe(0);
    expect(toSetCount(2.5, 'leg-press')).toBe(0);
    expect(toSetCount('2', 'leg-press')).toBe(0);
    expect(toSetCount(undefined, 'leg-press')).toBe(0);
  });

  it('isExerciseDone accepts raw stored values', () => {
    expect(isExerciseDone(3, 'leg-press')).toBe(true);
    expect(isExerciseDone(2, 'leg-press')).toBe(false);
    expect(isExerciseDone(true, 'plank')).toBe(true);
    expect(isExerciseDone(1, 'treadmill')).toBe(true);
  });

  it('exposes targets from the workout data', () => {
    expect(exerciseSets('leg-press')).toBe(3);
    expect(exerciseSets('treadmill')).toBe(1);
    expect(exerciseSets('unknown-key')).toBe(1);
    expect(getExerciseByKey('bike')?.sets).toBe(1);
    expect(getExerciseByKey('nope')).toBeUndefined();
  });
});
