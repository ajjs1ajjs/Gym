import {
  parseProgress,
  parseWeights,
  parseExWeights,
  parseExWeightHistory,
} from './storage';
import type { AllProgress } from './storage';
import type { WeightEntry } from './compute';
import type { ExWeightHistory } from './exweights';
import { todayStr, isRealCalendarDate } from './dates';
import { exerciseSets, getAllKeys } from './workout';

/**
 * Бекап усього стану застосунку одним JSON-файлом.
 * Конверт із версією — щоб майбутні зміни формату можна було мігрувати,
 * а чужий/старий файл — відхилити зі зрозумілою помилкою.
 *
 * v1 → v2: `exWeights` був map key→number без дат; при імпорті v1
 * значення датуються днем експорту файла (або сьогодні).
 */
export const BACKUP_APP = 'gym-tracker';
export const BACKUP_VERSION = 2;

export interface BackupData {
  progress: AllProgress;
  weights: WeightEntry[];
  exWeights: ExWeightHistory;
}

export interface BackupEnvelope {
  app: typeof BACKUP_APP;
  v: typeof BACKUP_VERSION;
  exportedAt: string;
  data: BackupData;
}

export function createBackup(data: BackupData, now: Date = new Date()): string {
  const envelope: BackupEnvelope = {
    app: BACKUP_APP,
    v: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(envelope);
}

export type BackupParseResult =
  | { ok: true; data: BackupData; discarded: number }
  | { ok: false; error: string };

const knownExerciseKeys = new Set(getAllKeys());

function countDiscarded(data: Record<string, unknown>, parsed: BackupData): number {
  let count = 0;
  const progress = data.progress;
  if (typeof progress === 'object' && progress !== null && !Array.isArray(progress)) {
    for (const [date, day] of Object.entries(progress)) {
      if (!isRealCalendarDate(date) || typeof day !== 'object' || day === null || Array.isArray(day)) {
        count++;
        continue;
      }
      const clean = parsed.progress[date];
      for (const [key, value] of Object.entries(day)) {
        if (!knownExerciseKeys.has(key)) { count++; continue; }
        const target = exerciseSets(key);
        const valid = value === true || (typeof value === 'number' && Number.isInteger(value) && value > 0);
        if (!valid || (typeof value === 'number' && value > target)) count++;
        else if (!clean || clean[key] === undefined) count++;
      }
    }
  }
  const rawWeights = data.weights;
  if (Array.isArray(rawWeights)) count += Math.max(0, rawWeights.length - parsed.weights.length);

  const rawHistory = data.exWeights;
  if (typeof rawHistory === 'object' && rawHistory !== null && !Array.isArray(rawHistory)) {
    for (const [key, value] of Object.entries(rawHistory)) {
      if (!knownExerciseKeys.has(key)) { count++; continue; }
      // v1 stored a single current value per exercise rather than dated points.
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0.5 || value > 999) count++;
        continue;
      }
      if (!Array.isArray(value)) { count++; continue; }
      const seen = new Set<string>();
      let validUnique = 0;
      for (const point of value) {
        if (typeof point !== 'object' || point === null || Array.isArray(point)) { count++; continue; }
        const p = point as { date?: unknown; weight?: unknown };
        if (Object.keys(point).length !== 2 || typeof p.date !== 'string' || !isRealCalendarDate(p.date) ||
          typeof p.weight !== 'number' || !Number.isFinite(p.weight) || p.weight < 0.5 || p.weight > 999) {
          count++;
        } else if (seen.has(p.date)) {
          count++;
        } else {
          seen.add(p.date);
          validUnique++;
        }
      }
      const cleanLength = parsed.exWeights[key]?.length ?? 0;
      count += Math.max(0, validUnique - cleanLength);
    }
  }
  return count;
}

function migrateV1ExWeights(value: unknown, exportedAt: unknown): ExWeightHistory | null {
  const map = parseExWeights(value);
  if (map === null) return null;
  const fallbackDate = todayStr();
  const stamp =
    typeof exportedAt === 'string' && isRealCalendarDate(exportedAt.slice(0, 10))
      ? exportedAt.slice(0, 10)
      : fallbackDate;
  const history: ExWeightHistory = {};
  for (const [k, weight] of Object.entries(map)) {
    history[k] = [{ date: stamp, weight }];
  }
  return history;
}

/** Парсинг із тими самими гардами, що й localStorage (погані записи не потрапляють у стан). */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл не є коректним JSON' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Невідомий формат файлу' };
  }
  const env = raw as Record<string, unknown>;
  if (env.app !== BACKUP_APP) {
    return { ok: false, error: 'Це не бекап Gym Tracker' };
  }
  if (env.v !== 1 && env.v !== BACKUP_VERSION) {
    return { ok: false, error: 'Непідтримувана версія бекапу' };
  }
  if (typeof env.data !== 'object' || env.data === null || Array.isArray(env.data)) {
    return { ok: false, error: 'Пошкоджений бекап: немає даних' };
  }
  const data = env.data as Record<string, unknown>;
  const progress = parseProgress(data.progress);
  const weights = parseWeights(data.weights);
  const exWeights =
    env.v === 2
      ? parseExWeightHistory(data.exWeights)
      : migrateV1ExWeights(data.exWeights, env.exportedAt);
  if (progress === null || weights === null || exWeights === null) {
    return { ok: false, error: 'Пошкоджений бекап: невірна структура даних' };
  }
  const parsedData = { progress, weights, exWeights };
  return { ok: true, data: parsedData, discarded: countDiscarded(data, parsedData) };
}
