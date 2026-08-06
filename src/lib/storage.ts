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

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
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
  const data = parse<AllProgress>(localStorage.getItem(STORAGE_KEY));
  if (data && typeof data === 'object') return data;

  const old = localStorage.getItem(LEGACY_KEY);
  if (old) {
    const p = parse<Record<string, unknown>>(old);
    if (p && typeof p === 'object') {
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
  const data = parse<WeightEntry[]>(localStorage.getItem(WEIGHT_KEY));
  return Array.isArray(data) ? data : [];
}

export function saveWeights(weights: WeightEntry[]): void {
  persist(WEIGHT_KEY, weights);
}

export function loadExWeights(): Record<string, number> {
  const data = parse<Record<string, number>>(localStorage.getItem(EX_WEIGHT_KEY));
  return data && typeof data === 'object' ? data : {};
}

export function saveExWeights(weights: Record<string, number>): void {
  persist(EX_WEIGHT_KEY, weights);
}
