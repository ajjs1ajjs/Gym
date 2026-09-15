const WEIGHT_RE = /^\d{1,3}([.,]\d+)?$/;
export const MIN_WEIGHT = 0.5;
export const MAX_WEIGHT = 999;

export function toWeight(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  // Strict shape: plain decimal only (no 1e3 / 0x10 / Infinity passthrough).
  if (!WEIGHT_RE.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < MIN_WEIGHT || n > MAX_WEIGHT) return null;
  return Math.round(n * 10) / 10;
}
