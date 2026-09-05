import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadAllProgress,
  saveAllProgress,
  loadWeights,
  saveWeights,
  loadExWeights,
  saveExWeights,
} from '../src/lib/storage';
import { todayStr } from '../src/lib/dates';

const V2 = 'gym-tracker-progress-v2';
const LEGACY = 'gym-tracker-progress';
const WEIGHTS = 'gym-tracker-weights';

beforeEach(() => {
  localStorage.clear();
});

describe('loadAllProgress', () => {
  it('returns empty object when nothing stored', () => {
    expect(loadAllProgress()).toEqual({});
  });

  it('reads stored v2 progress', () => {
    const data = { [todayStr()]: { 'leg-press': true } };
    localStorage.setItem(V2, JSON.stringify(data));
    expect(loadAllProgress()).toEqual(data);
  });

  it('migrates legacy non-date-keyed progress into today', () => {
    localStorage.setItem(LEGACY, JSON.stringify({ 'leg-press': true }));
    const all = loadAllProgress();
    expect(all[todayStr()]).toEqual({ 'leg-press': true });
    expect(localStorage.getItem(LEGACY)).toBeNull();
    expect(localStorage.getItem(V2)).not.toBeNull();
  });

  it('migrates legacy date-keyed progress as-is', () => {
    const data = { '2024-01-01': { 'leg-press': true } };
    localStorage.setItem(LEGACY, JSON.stringify(data));
    expect(loadAllProgress()).toEqual(data);
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it('falls back to empty on corrupt JSON', () => {
    localStorage.setItem(V2, '{corrupt');
    expect(loadAllProgress()).toEqual({});
  });
});

describe('saveAllProgress', () => {
  it('persists to v2 key', () => {
    const data = { [todayStr()]: { burpee: true } };
    saveAllProgress(data);
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')).toEqual(data);
  });
});

describe('weights storage', () => {
  it('round-trips weight entries', () => {
    const entries = [{ id: 1, date: '2024-01-01', weight: 80.5 }];
    saveWeights(entries);
    expect(loadWeights()).toEqual(entries);
  });

  it('returns [] for missing/corrupt data', () => {
    expect(loadWeights()).toEqual([]);
    localStorage.setItem(WEIGHTS, 'nope');
    expect(loadWeights()).toEqual([]);
  });
});

describe('exercise weight storage', () => {
  it('round-trips per-exercise weights', () => {
    saveExWeights({ 'leg-press': 120 });
    expect(loadExWeights()).toEqual({ 'leg-press': 120 });
  });

  it('returns {} for missing data', () => {
    expect(loadExWeights()).toEqual({});
  });
});
