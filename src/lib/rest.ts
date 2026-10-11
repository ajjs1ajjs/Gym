/** Чисті хелпери таймера відпочинку (без DOM — легко тестувати). */

/** Скільки секунд лишилось до `endAt`; ніколи не від'ємне. */
export function remainingSec(endAt: number, now: number): number {
  if (!Number.isFinite(endAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/** mm:ss для показу на таймері. */
export function formatClock(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '0:00';
  const s = Math.floor(totalSec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
