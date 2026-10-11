import { parseProgress, parseWeights, parseExWeights } from './storage';
import type { AllProgress } from './storage';
import type { WeightEntry } from './compute';

/**
 * Бекап усього стану застосунку одним JSON-файлом.
 * Конверт із версією — щоб майбутні зміни формату можна було мігрувати,
 * а чужий/старий файл — відхилити зі зрозумілою помилкою.
 */
export const BACKUP_APP = 'gym-tracker';
export const BACKUP_VERSION = 1;

export interface BackupData {
  progress: AllProgress;
  weights: WeightEntry[];
  exWeights: Record<string, number>;
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
  | { ok: true; data: BackupData }
  | { ok: false; error: string };

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
  if (env.v !== BACKUP_VERSION) {
    return { ok: false, error: 'Непідтримувана версія бекапу' };
  }
  if (typeof env.data !== 'object' || env.data === null || Array.isArray(env.data)) {
    return { ok: false, error: 'Пошкоджений бекап: немає даних' };
  }
  const data = env.data as Record<string, unknown>;
  const progress = parseProgress(data.progress);
  const weights = parseWeights(data.weights);
  const exWeights = parseExWeights(data.exWeights);
  if (progress === null || weights === null || exWeights === null) {
    return { ok: false, error: 'Пошкоджений бекап: невірна структура даних' };
  }
  return { ok: true, data: { progress, weights, exWeights } };
}
