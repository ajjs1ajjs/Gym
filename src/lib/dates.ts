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
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

export function formatDate(str: string): string {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

export function formatDateLabel(str: string): string {
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
