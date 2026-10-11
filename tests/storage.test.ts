import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadAllProgress,
  saveAllProgress,
  loadWeights,
  saveWeights,
  loadExWeights,
  saveExWeights,
  loadExWeightHistory,
  saveExWeightHistory,
} from '../src/lib/storage';
import { todayStr } from '../src/lib/dates';

const V2 = 'gym-tracker-progress-v2';
const LEGACY = 'gym-tracker-progress';
const WEIGHTS = 'gym-tracker-weights';
const EX_WEIGHTS = 'gym-tracker-ex-weights';
const EX_WEIGHTS_V2 = 'gym-tracker-ex-weights-v2';

beforeEach(() => {
  localStorage.clear();
});

describe('loadAllProgress', () => {
  it('returns empty object when nothing stored', () => {
    expect(loadAllProgress()).toEqual({});
  });

  it('reads stored v2 progress; boolean (legacy) becomes full set count', () => {
    const raw = { [todayStr()]: { 'leg-press': true, burpee: 2 } };
    localStorage.setItem(V2, JSON.stringify(raw));
    expect(loadAllProgress()).toEqual({ [todayStr()]: { 'leg-press': 3, burpee: 2 } });
  });

  it('clamps set counts to the exercise target and drops junk values', () => {
    localStorage.setItem(
      V2,
      JSON.stringify({
        [todayStr()]: {
          'leg-press': 99, // > цілі 3 → 3
          burpee: 2, // валідне число
          plank: -1, // сміття → дроп
          crunch: 2.5, // не ціле → дроп
          treadmill: 1, // ціль 1
        },
      }),
    );
    expect(loadAllProgress()).toEqual({
      [todayStr()]: { 'leg-press': 3, burpee: 2, treadmill: 1 },
    });
  });

  it('drops a day that has no valid entrances left', () => {
    localStorage.setItem(V2, JSON.stringify({ [todayStr()]: { 'leg-press': 'x' } }));
    expect(loadAllProgress()).toEqual({});
  });

  it('migrates legacy non-date-keyed progress into today', () => {
    localStorage.setItem(LEGACY, JSON.stringify({ 'leg-press': true }));
    const all = loadAllProgress();
    expect(all[todayStr()]).toEqual({ 'leg-press': 3 });
    expect(localStorage.getItem(LEGACY)).toBeNull();
    expect(localStorage.getItem(V2)).not.toBeNull();
  });

  it('migrates legacy date-keyed progress as-is', () => {
    const data = { '2024-01-01': { 'leg-press': true } };
    localStorage.setItem(LEGACY, JSON.stringify(data));
    expect(loadAllProgress()).toEqual({ '2024-01-01': { 'leg-press': 3 } });
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it('falls back to empty on corrupt JSON', () => {
    localStorage.setItem(V2, '{corrupt');
    expect(loadAllProgress()).toEqual({});
  });
});

describe('saveAllProgress', () => {
  it('persists to v2 key', () => {
    const data = { [todayStr()]: { burpee: 2 } };
    saveAllProgress(data);
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')).toEqual(data);
  });
});

describe('weights storage', () => {
  it('round-trips weight entries', () => {
    const entries = [{ id: 'abc-123', date: '2024-01-01', weight: 80.5 }];
    saveWeights(entries);
    expect(loadWeights()).toEqual(entries);
  });

  it('normalizes legacy numeric ids to strings', () => {
    localStorage.setItem(WEIGHTS, JSON.stringify([{ id: 1, date: '2024-01-01', weight: 80.5 }]));
    expect(loadWeights()).toEqual([{ id: '1', date: '2024-01-01', weight: 80.5 }]);
  });

  it('returns [] for missing/corrupt data', () => {
    expect(loadWeights()).toEqual([]);
    localStorage.setItem(WEIGHTS, 'nope');
    expect(loadWeights()).toEqual([]);
  });

  it('rejects out-of-shape entries (bad date, weight, id, extra keys)', () => {
    const bad = [
      [{ id: 'a', date: '2024-13-99', weight: 80 }],
      [{ id: 'a', date: '2024-02-30', weight: 80 }],
      [{ id: 'a', date: '2024-01-01', weight: 0.1 }],
      [{ id: 'a', date: '2024-01-01', weight: 1000 }],
      [{ id: 'a', date: '2024-01-01', weight: 80, extra: 1 }],
      [{ id: 1.5, date: '2024-01-01', weight: 80 }],
    ];
    for (const entries of bad) {
      localStorage.setItem(WEIGHTS, JSON.stringify(entries));
      expect(loadWeights()).toEqual([]);
    }
  });
});

describe('exercise weight storage (legacy map)', () => {
  it('round-trips per-exercise weights', () => {
    saveExWeights({ 'leg-press': 120 });
    expect(loadExWeights()).toEqual({ 'leg-press': 120 });
  });

  it('returns {} for missing data', () => {
    expect(loadExWeights()).toEqual({});
  });

  it('drops unknown keys and out-of-range values, keeps the rest', () => {
    localStorage.setItem(EX_WEIGHTS, JSON.stringify({ 'leg-press': 120, hacker: 5 }));
    expect(loadExWeights()).toEqual({ 'leg-press': 120 });
    localStorage.setItem(EX_WEIGHTS, JSON.stringify({ 'leg-press': -5 }));
    expect(loadExWeights()).toEqual({});
    localStorage.setItem(EX_WEIGHTS, JSON.stringify({ 'leg-press': 5000 }));
    expect(loadExWeights()).toEqual({});
  });
});

describe('exercise weight history storage', () => {
  it('round-trips history', () => {
    const h = {
      'leg-press': [
        { date: '2024-01-01', weight: 115 },
        { date: '2024-01-08', weight: 120 },
      ],
    };
    saveExWeightHistory(h);
    expect(loadExWeightHistory()).toEqual(h);
  });

  it('returns {} when nothing stored', () => {
    expect(loadExWeightHistory()).toEqual({});
  });

  it('migrates the legacy map (dated today) to v2 and keeps the old key', () => {
    saveExWeights({ 'leg-press': 120, 'lat-pulldown': 55 });
    const h = loadExWeightHistory();
    expect(h).toEqual({
      'leg-press': [{ date: todayStr(), weight: 120 }],
      'lat-pulldown': [{ date: todayStr(), weight: 55 }],
    });
    // Міграція записалась у v2, старий ключ лишився (rollback-safe).
    expect(JSON.parse(localStorage.getItem(EX_WEIGHTS_V2) ?? 'null')).toEqual(h);
    expect(localStorage.getItem(EX_WEIGHTS)).not.toBeNull();
    // Друге читання — уже без міграції, з v2.
    expect(loadExWeightHistory()).toEqual(h);
  });

  it('sanitizes points: bad entries dropped, one point per date, unknown keys dropped', () => {
    localStorage.setItem(
      EX_WEIGHTS_V2,
      JSON.stringify({
        'leg-press': [
          { date: '2024-01-02', weight: 120 },
          { date: '2024-01-01', weight: 115 },
          { date: '2024-01-02', weight: 122 }, // дубль дати — перемагає останній
          { date: '2024-02-30', weight: 120 }, // неіснуюча дата
          { date: '2024-01-03', weight: 5000 }, // поза діапазоном
          { date: '2024-01-03', weight: 120, extra: 1 }, // зайвий ключ
          'junk',
        ],
        hacker: [{ date: '2024-01-01', weight: 10 }], // невідома вправа
        burpee: 'nope', // не масив
      }),
    );
    expect(loadExWeightHistory()).toEqual({
      'leg-press': [
        { date: '2024-01-01', weight: 115 },
        { date: '2024-01-02', weight: 122 },
      ],
    });
  });

  it('rejects non-date keys in progress', () => {
    localStorage.setItem(V2, JSON.stringify({ 'not-a-date': { 'leg-press': true } }));
    expect(loadAllProgress()).toEqual({});
  });

  it('drops unknown exercise keys in progress, keeps the rest', () => {
    localStorage.setItem(V2, JSON.stringify({ [todayStr()]: { 'leg-press': true, evil: true } }));
    expect(loadAllProgress()).toEqual({ [todayStr()]: { 'leg-press': 3 } });
  });

  it('trims days beyond the limit instead of wiping everything', () => {
    const data: Record<string, { 'leg-press': boolean }> = {};
    let firstKey = '';
    let lastKey = '';
    for (let i = 0; i < 3705; i++) {
      const d = new Date(2000, 0, 1 + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (i === 0) firstKey = key;
      lastKey = key;
      data[key] = { 'leg-press': true };
    }
    localStorage.setItem(V2, JSON.stringify(data));
    const loaded = loadAllProgress();
    expect(Object.keys(loaded)).toHaveLength(3700);
    // Newest days survive, oldest are trimmed.
    expect(loaded[lastKey]).toEqual({ 'leg-press': 3 });
    expect(loaded[firstKey]).toBeUndefined();
  });

  it('quarantines unparseable JSON instead of losing it silently', () => {
    localStorage.setItem(V2, '{corrupt');
    expect(loadAllProgress()).toEqual({});
    const backups: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      if (k.startsWith(V2 + '.corrupt.')) backups.push(k);
    }
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0] as string)).toBe('{corrupt');
  });
});
