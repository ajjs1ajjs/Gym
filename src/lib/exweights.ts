import { formatDate } from './dates';

/** Одна точка історії ваги вправи: записана на конкретний день тренування. */
export interface ExWeightPoint {
  date: string;
  weight: number;
}

/** Історія по кожній вправі, відсортована за датою (зростання). */
export type ExWeightHistory = Record<string, ExWeightPoint[]>;

export interface ExWeightView {
  /** Вага для показу: запис на обраний день, інакше — останній відомий. */
  current: number | null;
  /** Дата, до якої належить `current`. */
  currentDate: string | null;
  /** Попередній запис перед `current` (для підказки «перед цим»). */
  previous: ExWeightPoint | null;
}

function byDateAsc(a: ExWeightPoint, b: ExWeightPoint): number {
  return a.date.localeCompare(b.date);
}

/**
 * Що показати для вправи на обрану дату:
 * точний запис дня → інакше останній відомий; `previous` — те, що було раніше.
 */
export function resolveExWeight(
  history: ExWeightHistory,
  key: string,
  date: string,
): ExWeightView {
  const list = [...(history[key] ?? [])].sort(byDateAsc);
  const applicable = list.filter((p) => p.date <= date);
  const applicableIdx = applicable.length - 1;
  if (applicableIdx >= 0) {
    const exact = applicable[applicableIdx] as ExWeightPoint;
    return {
      current: exact.weight,
      currentDate: exact.date,
      previous: applicableIdx > 0 ? (applicable[applicableIdx - 1] as ExWeightPoint) : null,
    };
  }
  return { current: null, currentDate: null, previous: null };
}

/** Записати вагу на дату (одна точка на дату — перезапис, як у ваги тіла). */
export function upsertExWeight(
  history: ExWeightHistory,
  key: string,
  date: string,
  weight: number,
): ExWeightHistory {
  const list = history[key] ?? [];
  const next = list.some((p) => p.date === date)
    ? list.map((p) => (p.date === date ? { date, weight } : p)).sort(byDateAsc)
    : [...list, { date, weight }].sort(byDateAsc);
  return { ...history, [key]: next };
}

/** Рядок-підказка під вагою вправи; null — показувати нічого. */
export function exWeightHint(view: ExWeightView, date: string): string | null {
  if (view.current === null || view.currentDate === null) return null;
  if (view.currentDate === date) {
    return view.previous
      ? `перед цим: ${view.previous.weight} кг · ${formatDate(view.previous.date)}`
      : null;
  }
  return `останнє: ${view.current} кг · ${formatDate(view.currentDate)}`;
}
