import { DATE_RE, todayStr } from './dates';
import type { WeightEntry } from './compute';

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

function isDayProgress(v: unknown): v is DayProgress {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v).every((val): val is boolean => typeof val === 'boolean');
}

function isAllProgress(v: unknown): v is AllProgress {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v).every(isDayProgress);
}

function isWeightEntryArray(v: unknown): v is WeightEntry[] {
  return Array.isArray(v) && v.every((w): w is WeightEntry =>
    typeof w === 'object' && w !== null &&
    typeof w.id === 'number' && typeof w.date === 'string' && typeof w.weight === 'number'
  );
}

function isExWeights(v: unknown): v is Record<string, number> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v).every((val): val is number => typeof val === 'number');
}

function parse<T>(raw: string | null, validator: (v: unknown) => v is T): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (validator(parsed)) return parsed;
    console.error('Invalid schema for storage key');
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
  const data = parse<AllProgress>(localStorage.getItem(STORAGE_KEY), isAllProgress);
  if (data) return data;

  const old = localStorage.getItem(LEGACY_KEY);
  if (old) {
    const p = parse<Record<string, unknown>>(old, (v): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
    );
    if (p) {
      const hasDateKeys = Object.keys(p).some((k) => DATE_RE.test(k));
      const migrated: AllProgress = hasDateKeys ? (p as AllProgress) : { [todayStr()]: p as DayProgress };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  }
  return {};
}

export function saveAllProgress(all: AllProgress): void {
  persist(STORAGE_KEY, all);
}

export function loadWeights(): WeightEntry[] {
  const data = parse<WeightEntry[]>(localStorage.getItem(WEIGHT_KEY), isWeightEntryArray);
  return data ?? [];
}

export function saveWeights(weights: WeightEntry[]): void {
  persist(WEIGHT_KEY, weights);
}

export function loadExWeights(): Record<string, number> {
  const data = parse<Record<string, number>>(localStorage.getItem(EX_WEIGHT_KEY), isExWeights);
  return data ?? {};
}

export function saveExWeights(weights: Record<string, number>): void {
  persist(EX_WEIGHT_KEY, weights);
}

export { STORAGE_KEY, WEIGHT_KEY, EX_WEIGHT_KEY, LEGACY_KEY };
