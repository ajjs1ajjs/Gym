export function toWeight(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}
