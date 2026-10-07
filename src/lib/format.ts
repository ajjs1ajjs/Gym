const WEIGHT_RE = /^\d{1,3}([.,]\d+)?$/;
export const MIN_WEIGHT = 0.5;
export const MAX_WEIGHT = 999;

export function toWeight(raw: unknown): number | null {
  const s = String(raw ?? '').trim();
  // LOGIC-002: одна кома = десятковий роздільник; кілька ком або суміш із
  // крапкою ("1,000", "1.000,5") — неоднозначно, відхиляємо (раніше "1,000"
  // ставало 1 кг замість помилки).
  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;
  if (commas > 1 || (commas === 1 && dots >= 1)) return null;
  // Кома перед рівно трьома цифрами в кінці — роздільник тисяч ("1,000"),
  // не десятковий знак: відхиляємо замість тихого "1 кг".
  if (/,\d{3}$/.test(s)) return null;
  const norm = commas === 1 ? s.replace(',', '.') : s;
  // Strict shape: plain decimal only (no 1e3 / 0x10 / Infinity passthrough).
  if (!WEIGHT_RE.test(norm)) return null;
  const n = Number(norm);
  if (!Number.isFinite(n) || n < MIN_WEIGHT || n > MAX_WEIGHT) return null;
  return Math.round(n * 10) / 10;
}
