import { describe, expect, it } from 'vitest';
import {
  localDateStr,
  todayStr,
  formatDate,
  formatDateLabel,
  isValidDateEntry,
} from '../src/lib/dates';
import { toWeight } from '../src/lib/format';
import { computeWeightDiffs } from '../src/lib/compute';
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

  it('rejects garbage, negatives, zero, empty', () => {
    expect(toWeight('12abc')).toBeNull();
    expect(toWeight('')).toBeNull();
    expect(toWeight('   ')).toBeNull();
    expect(toWeight('-3')).toBeNull();
    expect(toWeight('0')).toBeNull();
    expect(toWeight('abc')).toBeNull();
    expect(toWeight(null)).toBeNull();
    expect(toWeight(undefined)).toBeNull();
    expect(toWeight(NaN)).toBeNull();
  });
});

describe('isValidDateEntry', () => {
  it('validates progress objects', () => {
    expect(isValidDateEntry({ 'leg-press': true })).toBe(true);
    expect(isValidDateEntry({})).toBe(false);
    expect(isValidDateEntry(null)).toBe(false);
    expect(isValidDateEntry(undefined)).toBe(false);
    expect(isValidDateEntry('x')).toBe(false);
    expect(isValidDateEntry(42)).toBe(false);
  });
});

describe('computeWeightDiffs', () => {
  const entries = (
    data: Array<{ id: number; date: string; weight: number }>,
  ): WeightEntry[] => data;

  it('uses chronological neighbor, not insertion order', () => {
    const sorted = entries([
      { id: 3, date: '2024-03-03', weight: 80 },
      { id: 1, date: '2024-03-01', weight: 82 },
      { id: 2, date: '2024-02-25', weight: 84 },
    ]);
    expect(computeWeightDiffs(sorted)).toEqual([-2, -2, null]);
  });

  it('handles empty and single-entry lists', () => {
    expect(computeWeightDiffs([])).toEqual([]);
    expect(computeWeightDiffs([{ id: 1, date: '2024-01-01', weight: 80 }])).toEqual([null]);
  });

  it('rounds to one decimal', () => {
    const sorted = entries([
      { id: 1, date: '2024-03-02', weight: 80.1 },
      { id: 2, date: '2024-03-01', weight: 80 },
    ]);
    expect(computeWeightDiffs(sorted)).toEqual([0.1, null]);
  });
});
