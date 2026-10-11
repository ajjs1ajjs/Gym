import { todayStr, isRealCalendarDate } from './dates';
import type { WeightEntry } from './compute';
import type { ExWeightHistory, ExWeightPoint } from './exweights';
import { getAllKeys, toSetCount } from './workout';
import { MIN_WEIGHT, MAX_WEIGHT } from './format';

/** День: ключ вправи → кількість виконаних підходів (старий формат boolean приймається). */
export type DayProgress = Record<string, number>;
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
const EX_WEIGHT_V2_KEY = 'gym-tracker-ex-weights-v2';
const LEGACY_KEY = 'gym-tracker-progress';

const MAX_DAYS = 3700; // ~10 years of daily history
const MAX_WEIGHT_ENTRIES = 5000;
const MAX_EX_POINTS = 500; // історія на одну вправу

const KNOWN_KEYS: ReadonlySet<string> = new Set(getAllKeys());

function isWeightId(v: unknown): v is string | number {
  return (typeof v === 'string' && v.length > 0 && v.length <= 64) ||
    (typeof v === 'number' && Number.isInteger(v) && Number.isSafeInteger(v));
}

/** Один запис ваги: строга поштучна перевірка (поганий запис дропається, решта живе). */
function isWeightEntry(w: unknown): w is WeightEntry {
  if (typeof w !== 'object' || w === null || Array.isArray(w)) return false;
  const keys = Object.keys(w);
  if (keys.length !== 3 || !('id' in w && 'date' in w && 'weight' in w)) return false;
  const e = w as { id: unknown; date: unknown; weight: unknown };
  return isWeightId(e.id) &&
    typeof e.date === 'string' && isRealCalendarDate(e.date) &&
    typeof e.weight === 'number' && Number.isFinite(e.weight) &&
    e.weight >= MIN_WEIGHT && e.weight <= MAX_WEIGHT;
}

/** День: невідомі ключі (видалені вправи) відкидаємо з warn;
 *  значення — підходи (число) або старий boolean; 0/сміття → ключ дропається. */
function sanitizeDay(day: unknown): DayProgress | null {
  if (typeof day !== 'object' || day === null || Array.isArray(day)) return null;
  const clean: DayProgress = {};
  for (const [k, v] of Object.entries(day)) {
    if (!KNOWN_KEYS.has(k)) {
      console.warn(`Ignoring unknown exercise key in storage: ${k}`);
      continue;
    }
    const sets = toSetCount(v, k);
    if (sets > 0) clean[k] = sets;
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // SecurityError (приватний режим) тощо
  }
}

function alreadyQuarantined(key: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if ((localStorage.key(i) ?? '').startsWith(key + '.corrupt.')) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function quarantine(key: string, raw: string): void {
  try {
    if (alreadyQuarantined(key)) return;
    localStorage.setItem(`${key}.corrupt.${Date.now()}`, raw);
  } catch {
    /* квота/доступ — більше нічого не вдіємо */
  }
}

function readJson(key: string): { found: true; value: unknown } | { found: false } {
  const raw = safeGetItem(key);
  if (!raw) return { found: false };
  try {
    return { found: true, value: JSON.parse(raw) };
  } catch {
    // DATA-002: битий JSON — у карантин (один раз), а не мовчазна втрата.
    console.error(`Unparseable JSON for storage key: ${key}; quarantined`);
    quarantine(key, raw);
    return { found: false };
  }
}

function trimDays(all: AllProgress): AllProgress {
  const keys = Object.keys(all).sort();
  if (keys.length <= MAX_DAYS) return all;
  const keep = new Set(keys.slice(keys.length - MAX_DAYS));
  const out: AllProgress = {};
  for (const [k, v] of Object.entries(all)) {
    if (keep.has(k)) out[k] = v;
  }
  return out;
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Чистий парсер прогресу (спільний для localStorage та імпорту бекапу).
 * `null` — значення взагалі не схоже на мапу днів; інакше — очищений результат.
 */
export function parseProgress(value: unknown): AllProgress | null {
  if (!isPlainObject(value)) return null;
  const out: AllProgress = {};
  for (const [k, day] of Object.entries(value)) {
    if (!isRealCalendarDate(k)) {
      console.warn(`Ignoring non-date key in storage: ${k}`);
      continue;
    }
    const clean = sanitizeDay(day);
    if (clean === null) continue;
    out[k] = clean;
  }
  return trimDays(out);
}

export function loadAllProgress(): AllProgress {
  const r = readJson(STORAGE_KEY);
  if (r.found) {
    const parsed = parseProgress(r.value);
    if (parsed) return parsed;
    console.error(`Invalid schema for storage key: ${STORAGE_KEY}`);
  }

  // Legacy-міграція: валідуємо тими самими гардами, пишемо крізь safe-функції,
  // legacy-ключ прибираємо завжди (навіть битий — DATA-004).
  const old = readJson(LEGACY_KEY);
  try {
    if (old.found && isPlainObject(old.value)) {
      const p = old.value;
      const hasDateKeys = Object.keys(p).some((k) => isRealCalendarDate(k));
      let migrated: AllProgress | null = null;
      if (hasDateKeys) {
        const out: AllProgress = {};
        for (const [k, day] of Object.entries(p)) {
          if (!isRealCalendarDate(k)) continue;
          const clean = sanitizeDay(day);
          if (clean === null) continue;
          out[k] = clean;
        }
        if (Object.keys(out).length > 0) migrated = trimDays(out);
      } else if (
        Object.keys(p).length <= KNOWN_KEYS.size &&
        Object.values(p).every((val) => typeof val === 'boolean' || typeof val === 'number')
      ) {
        const day: DayProgress = {};
        for (const [k, val] of Object.entries(p)) {
          if (!KNOWN_KEYS.has(k)) continue;
          const sets = toSetCount(val, k);
          if (sets > 0) day[k] = sets;
        }
        if (Object.keys(day).length > 0) migrated = { [todayStr()]: day };
      }
      if (migrated) {
        if (safeSetItem(STORAGE_KEY, JSON.stringify(migrated))) return migrated;
        return {};
      }
      return {};
    }
  } finally {
    safeRemoveItem(LEGACY_KEY);
  }
  return {};
}

export function saveAllProgress(all: AllProgress): void {
  persist(STORAGE_KEY, all);
}

/** Чистий парсер вимірювань ваги (спільний для localStorage та імпорту бекапу). */
export function parseWeights(value: unknown): WeightEntry[] | null {
  if (!Array.isArray(value)) return null;
  // DATA-001: погані записи дропаємо поштучно; надлишок обрізаємо (перші = новіші).
  return value
    .filter(isWeightEntry)
    .map((w) => ({ ...w, id: String(w.id) }))
    .slice(0, MAX_WEIGHT_ENTRIES);
}

export function loadWeights(): WeightEntry[] {
  const r = readJson(WEIGHT_KEY);
  if (!r.found) return [];
  const parsed = parseWeights(r.value);
  if (parsed) return parsed;
  console.error('Invalid schema for storage key');
  return [];
}

export function saveWeights(weights: WeightEntry[]): void {
  persist(WEIGHT_KEY, weights);
}

/** Чистий парсер ваг вправ (спільний для localStorage та імпорту бекапу). */
export function parseExWeights(value: unknown): Record<string, number> | null {
  if (!isPlainObject(value)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (!KNOWN_KEYS.has(k)) {
      console.warn(`Ignoring unknown exercise key in storage: ${k}`);
      continue;
    }
    if (typeof v !== 'number' || !Number.isFinite(v) || v < MIN_WEIGHT || v > MAX_WEIGHT) continue;
    out[k] = v;
  }
  return out;
}

export function loadExWeights(): Record<string, number> {
  const r = readJson(EX_WEIGHT_KEY);
  if (!r.found) return {};
  const parsed = parseExWeights(r.value);
  if (parsed) return parsed;
  console.error('Invalid schema for storage key');
  return {};
}

export function saveExWeights(weights: Record<string, number>): void {
  persist(EX_WEIGHT_KEY, weights);
}

function isExWeightPoint(v: unknown): v is ExWeightPoint {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  if (keys.length !== 2 || !('date' in v && 'weight' in v)) return false;
  const e = v as { date: unknown; weight: unknown };
  return (
    typeof e.date === 'string' &&
    isRealCalendarDate(e.date) &&
    typeof e.weight === 'number' &&
    Number.isFinite(e.weight) &&
    e.weight >= MIN_WEIGHT &&
    e.weight <= MAX_WEIGHT
  );
}

/** Чистий парсер історії ваг вправ: одна точка на дату, хронологічно, з обрізкою. */
export function parseExWeightHistory(value: unknown): ExWeightHistory | null {
  if (!isPlainObject(value)) return null;
  const out: ExWeightHistory = {};
  for (const [k, v] of Object.entries(value)) {
    if (!KNOWN_KEYS.has(k)) {
      console.warn(`Ignoring unknown exercise key in storage: ${k}`);
      continue;
    }
    if (!Array.isArray(v)) continue;
    const byDate = new Map<string, ExWeightPoint>();
    for (const point of v) {
      if (!isExWeightPoint(point)) continue;
      byDate.set(point.date, { date: point.date, weight: point.weight });
    }
    const clean = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (clean.length > 0) out[k] = clean.slice(-MAX_EX_POINTS);
  }
  return out;
}

/** Історія ваг вправ із міграцією зі старого формату (map key→number, без дат). */
export function loadExWeightHistory(): ExWeightHistory {
  const r = readJson(EX_WEIGHT_V2_KEY);
  if (r.found) {
    const parsed = parseExWeightHistory(r.value);
    if (parsed) return parsed;
    console.error(`Invalid schema for storage key: ${EX_WEIGHT_V2_KEY}`);
    return {};
  }
  // Міграція: стара вага без дати — фіксуємо сьогоднішнім днем.
  // Старий ключ НЕ видаляємо: відкат на попередню версію збереже дані.
  const old = readJson(EX_WEIGHT_KEY);
  if (old.found) {
    const map = parseExWeights(old.value);
    if (map && Object.keys(map).length > 0) {
      const today = todayStr();
      const migrated: ExWeightHistory = {};
      for (const [k, weight] of Object.entries(map)) {
        migrated[k] = [{ date: today, weight }];
      }
      try {
        persist(EX_WEIGHT_V2_KEY, migrated);
      } catch {
        /* квота: лишаємо в пам'яті, наступний save спробує ще раз */
      }
      return migrated;
    }
  }
  return {};
}

export function saveExWeightHistory(history: ExWeightHistory): void {
  persist(EX_WEIGHT_V2_KEY, history);
}

function isQuotaError(e: unknown): boolean {
  // DATA-005: Chrome/Safari QuotaExceededError + Firefox NS_ERROR_DOM_QUOTA_REACHED
  // (приватний режим) + застарілий код 22.
  return e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
}

function persist(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (isQuotaError(e)) {
      throw new StorageQuotaError();
    }
    throw e;
  }
}

export { STORAGE_KEY, WEIGHT_KEY, EX_WEIGHT_KEY, EX_WEIGHT_V2_KEY, LEGACY_KEY };
