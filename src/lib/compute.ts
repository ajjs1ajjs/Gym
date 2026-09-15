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
