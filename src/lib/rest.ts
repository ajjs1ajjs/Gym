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

/** Короткий подвійний сигнал завершення відпочинку через Web Audio API (best-effort). */
export function playRestDoneTone(): void {
  try {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const notes = [880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.16;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {
    /* аудіо недоступне або заблоковане політикою автопрогравання */
  }
}
