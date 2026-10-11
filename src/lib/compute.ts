export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export function byDateDesc(a: WeightEntry, b: WeightEntry): number {
  return b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
}

export function computeWeightDiffs(sorted: WeightEntry[]): (number | null)[] {
  return sorted.map((w, i) => {
    if (i >= sorted.length - 1) return null;
    const next = sorted[i + 1];
    if (!next) return null;
    return Math.round((w.weight - next.weight) * 10) / 10;
  });
}

/** Clamped 0–100 progress percent; untrusted counts can't overflow the bar. */
export function progressPct(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/** Collision-free entry id (ms timestamps collide across tabs/double-clicks). */
export function newWeightId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

export interface SparkPoint {
  x: number;
  y: number;
}

export interface Sparkline {
  /** SVG path полілінії (порожній для однієї точки). */
  line: string;
  /** Замкнений path для заливки під лінією (порожній, якщо точок < 2). */
  area: string;
  /** Остання точка — для акцентного кружечка. */
  last: SparkPoint | null;
  min: number;
  max: number;
}

/**
 * Мінімальний спарклайн без залежностей: значення → координати у viewBox
 * `width`×`height` з відступами `pad`. Плоскі серії малюються по центру,
 * а не діляться на нуль.
 */
export function buildSparkline(
  values: number[],
  width = 300,
  height = 84,
  pad = 8,
): Sparkline | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0 || width <= pad * 2 || height <= pad * 2) return null;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const points: SparkPoint[] = clean.map((v, i) => {
    const x = clean.length === 1 ? pad + innerW / 2 : pad + (i / (clean.length - 1)) * innerW;
    const y = span === 0 ? pad + innerH / 2 : pad + (1 - (v - min) / span) * innerH;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const area =
    points.length < 2
      ? ''
      : `${line} L${points[points.length - 1]?.x} ${height - pad} L${points[0]?.x} ${height - pad} Z`;
  return { line, area, last: points[points.length - 1] ?? null, min, max };
}
