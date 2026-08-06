export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
}

export function byDateDesc(a: WeightEntry, b: WeightEntry): number {
  return b.date.localeCompare(a.date);
}

export function computeWeightDiffs(sorted: WeightEntry[]): (number | null)[] {
  return sorted.map((w, i) => {
    if (i >= sorted.length - 1) return null;
    const next = sorted[i + 1];
    if (!next) return null;
    return Math.round((w.weight - next.weight) * 10) / 10;
  });
}
