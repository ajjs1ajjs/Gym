import { DATE_RE, todayStr, isRealCalendarDate } from './dates';
import type { WeightEntry } from './compute';
import { getAllKeys } from './workout';
import { MIN_WEIGHT, MAX_WEIGHT } from './format';

export type DayProgress = Record<string, boolean>;
export type AllProgress = Record<string, DayProgress>;

export class StorageQuotaError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'StorageQuotaError';
  }
}

const STORAGE_KEY = 'gym-tracker-progress-v2';
const WEIGHT_KEY = 'gym-tracker-weights';
const EX_WEIGHT_KEY = 'gym-tracker-ex-weights';
const LEGACY_KEY = 'gym-tracker-progress';

const MAX_DAYS = 3700; // ~10 years of daily history
const MAX_WEIGHT_ENTRIES = 5000;

const KNOWN_KEYS: ReadonlySet<string> = new Set(getAllKeys());

function isDayProgress(v: unknown): v is DayProgress {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.keys(v).length <= KNOWN_KEYS.size &&
    Object.entries(v).every(([k, val]) => KNOWN_KEYS.has(k) && typeof val === 'boolean');
}

function isAllProgress(v: unknown): v is AllProgress {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.keys(v).length <= MAX_DAYS &&
    Object.entries(v).every(([k, day]) => DATE_RE.test(k) && isDayProgress(day));
}

function isWeightId(v: unknown): v is string | number {
  return (typeof v === 'string' && v.length > 0 && v.length <= 64) ||
    (typeof v === 'number' && Number.isInteger(v) && Number.isSafeInteger(v));
}

function isWeightEntryArray(v: unknown): v is WeightEntry[] {
  return Array.isArray(v) && v.length <= MAX_WEIGHT_ENTRIES && v.every((w): w is WeightEntry => {
    if (typeof w !== 'object' || w === null || Array.isArray(w)) return false;
    const keys = Object.keys(w);
    if (keys.length !== 3 || !('id' in w && 'date' in w && 'weight' in w)) return false;
    const e = w as { id: unknown; date: unknown; weight: unknown };
    return isWeightId(e.id) &&
      typeof e.date === 'string' && isRealCalendarDate(e.date) &&
      typeof e.weight === 'number' && Number.isFinite(e.weight) &&
      e.weight >= MIN_WEIGHT && e.weight <= MAX_WEIGHT;
  });
}

function isExWeights(v: unknown): v is Record<string, number> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.keys(v).length <= KNOWN_KEYS.size &&
    Object.entries(v).every(([k, val]) =>
      KNOWN_KEYS.has(k) && typeof val === 'number' && Number.isFinite(val) &&
      val >= MIN_WEIGHT && val <= MAX_WEIGHT);
}

function parse<T>(raw: string | null, key: string, validator: (v: unknown) => v is T): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (validator(parsed)) return parsed;
    console.error(`Invalid schema for storage key: ${key}`);
    return null;
  } catch {
    return null;
  }
}

function persist(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new StorageQuotaError();
    }
    throw e;
  }
}

export function loadAllProgress(): AllProgress {
  const data = parse<AllProgress>(localStorage.getItem(STORAGE_KEY), STORAGE_KEY, isAllProgress);
  if (data) return data;

  const old = localStorage.getItem(LEGACY_KEY);
  if (old) {
    const p = parse<Record<string, unknown>>(old, LEGACY_KEY, (v): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
    );
    if (p) {
      // Validate with the real guards before accepting — never cast blindly.
      const hasDateKeys = Object.keys(p).some((k) => DATE_RE.test(k));
      let migrated: AllProgress | null = null;
      if (hasDateKeys) {
        if (isAllProgress(p)) migrated = p;
      } else if (
        Object.keys(p).length <= KNOWN_KEYS.size &&
        Object.values(p).every((val) => typeof val === 'boolean')
      ) {
        const day: DayProgress = {};
        for (const [k, val] of Object.entries(p)) {
          if (KNOWN_KEYS.has(k) && typeof val === 'boolean') day[k] = val;
        }
        if (Object.keys(day).length > 0) migrated = { [todayStr()]: day };
      }
      localStorage.removeItem(LEGACY_KEY);
      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return {};
    }
  }
  return {};
}

export function saveAllProgress(all: AllProgress): void {
  persist(STORAGE_KEY, all);
}

export function loadWeights(): WeightEntry[] {
  const raw = localStorage.getItem(WEIGHT_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isWeightEntryArray(parsed)) {
      console.error('Invalid schema for storage key');
      return [];
    }
    // Normalize legacy numeric ids to strings (crypto ids are strings).
    return parsed.map((w) => ({ ...w, id: String(w.id) }));
  } catch {
    return [];
  }
}

export function saveWeights(weights: WeightEntry[]): void {
  persist(WEIGHT_KEY, weights);
}

export function loadExWeights(): Record<string, number> {
  const data = parse<Record<string, number>>(localStorage.getItem(EX_WEIGHT_KEY), EX_WEIGHT_KEY, isExWeights);
  return data ?? {};
}

export function saveExWeights(weights: Record<string, number>): void {
  persist(EX_WEIGHT_KEY, weights);
}

export { STORAGE_KEY, WEIGHT_KEY, EX_WEIGHT_KEY, LEGACY_KEY };
