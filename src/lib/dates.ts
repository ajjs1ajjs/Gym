export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function localDateStr(date: Date): string {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

export function todayStr(): string {
  return localDateStr(new Date());
}

export function shiftDate(dateStr: string, delta: number): string {
  if (!isRealCalendarDate(dateStr) || !Number.isInteger(delta)) return todayStr();
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] as number;
  const m = parts[1] as number;
  const d = parts[2] as number;
  const date = new Date(y, m - 1, d + delta);
  return localDateStr(date);
}

export function formatDate(str: string): string {
  if (!isRealCalendarDate(str)) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

export function formatDateLabel(str: string): string {
  if (!isRealCalendarDate(str)) return '—';
  if (str === todayStr()) return 'Сьогодні';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (str === localDateStr(y)) return 'Вчора';
  return new Date(str + 'T00:00:00').toLocaleDateString('uk-UA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function isValidDateEntry(p: unknown): p is Record<string, boolean> {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const keys = Object.keys(p);
  return keys.length > 0 && keys.every((k) => typeof (p as Record<string, unknown>)[k] === 'boolean');
}

/** Strict `YYYY-MM-DD` shape + real calendar date (rejects 2024-02-30 etc). */
export function isRealCalendarDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidDateStr(s: unknown): s is string {
  return typeof s === 'string' && isRealCalendarDate(s);
}

/** Display/persist guard: real date, not in the future. */
export function isUsableDateStr(s: unknown): s is string {
  return isValidDateStr(s) && s <= todayStr();
}
