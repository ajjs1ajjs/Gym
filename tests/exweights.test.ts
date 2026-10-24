import { describe, expect, it } from 'vitest';
import { resolveExWeight, upsertExWeight, exWeightHint } from '../src/lib/exweights';
import type { ExWeightHistory } from '../src/lib/exweights';

const H: ExWeightHistory = {
  'leg-press': [
    { date: '2024-01-01', weight: 115 },
    { date: '2024-01-08', weight: 120 },
    { date: '2024-01-15', weight: 122.5 },
  ],
};

describe('resolveExWeight', () => {
  it('returns the exact entry for the date with its predecessor', () => {
    expect(resolveExWeight(H, 'leg-press', '2024-01-08')).toEqual({
      current: 120,
      currentDate: '2024-01-08',
      previous: { date: '2024-01-01', weight: 115 },
    });
  });

  it('falls back to the latest known for a date without an entry', () => {
    expect(resolveExWeight(H, 'leg-press', '2024-02-01')).toEqual({
      current: 122.5,
      currentDate: '2024-01-15',
      previous: { date: '2024-01-08', weight: 120 },
    });
  });

  it('returns nulls for an unknown exercise or empty history', () => {
    expect(resolveExWeight(H, 'burpee', '2024-01-08')).toEqual({
      current: null,
      currentDate: null,
      previous: null,
    });
    expect(resolveExWeight({}, 'leg-press', '2024-01-08')).toEqual({
      current: null,
      currentDate: null,
      previous: null,
    });
  });

  it('tolerates unsorted history', () => {
    const unsorted: ExWeightHistory = {
      'leg-press': [
        { date: '2024-01-15', weight: 122.5 },
        { date: '2024-01-01', weight: 115 },
        { date: '2024-01-08', weight: 120 },
      ],
    };
    const view = resolveExWeight(unsorted, 'leg-press', '2024-01-08');
    expect(view.current).toBe(120);
    expect(view.previous).toEqual({ date: '2024-01-01', weight: 115 });
  });

  it('does not show a future exercise weight on a past date', () => {
    expect(resolveExWeight(H, 'leg-press', '2023-12-31')).toEqual({
      current: null,
      currentDate: null,
      previous: null,
    });
    expect(resolveExWeight(H, 'leg-press', '2024-01-10').current).toBe(120);
  });
});

describe('upsertExWeight', () => {
  it('appends a new point chronologically', () => {
    const next = upsertExWeight(H, 'leg-press', '2024-01-20', 125);
    expect(next['leg-press']?.map((p) => p.date)).toEqual([
      '2024-01-01',
      '2024-01-08',
      '2024-01-15',
      '2024-01-20',
    ]);
  });

  it('replaces a point for an existing date (one per date)', () => {
    const next = upsertExWeight(H, 'leg-press', '2024-01-08', 121);
    const list = next['leg-press'] ?? [];
    expect(list).toHaveLength(3);
    expect(list[1]).toEqual({ date: '2024-01-08', weight: 121 });
  });

  it('does not mutate the input and creates unknown keys', () => {
    const before = JSON.stringify(H);
    const next = upsertExWeight(H, 'burpee', '2024-01-20', 10);
    expect(JSON.stringify(H)).toBe(before);
    expect(next['burpee']).toEqual([{ date: '2024-01-20', weight: 10 }]);
  });
});

describe('exWeightHint', () => {
  it('shows "останнє" when the weight comes from another day', () => {
    const hint = exWeightHint(resolveExWeight(H, 'leg-press', '2024-02-01'), '2024-02-01');
    expect(hint).toContain('останнє');
    expect(hint).toContain('122.5');
  });

  it('shows "перед цим" when the selected day has its own entry', () => {
    const hint = exWeightHint(resolveExWeight(H, 'leg-press', '2024-01-15'), '2024-01-15');
    expect(hint).toContain('перед цим');
    expect(hint).toContain('120');
  });

  it('returns null when there is nothing to show', () => {
    expect(exWeightHint(resolveExWeight(H, 'leg-press', '2024-01-01'), '2024-01-01')).toBeNull();
    expect(exWeightHint(resolveExWeight({}, 'leg-press', '2024-01-01'), '2024-01-01')).toBeNull();
  });
});
