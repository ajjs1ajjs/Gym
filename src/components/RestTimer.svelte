<script lang="ts">
  import { formatClock, remainingSec } from '../lib/rest';

  let {
    endAt,
    total,
    label,
    onextend,
    onstop,
    ondone,
  } = $props<{
    endAt: number | null;
    total: number;
    label: string;
    onextend: (extraSec: number) => void;
    onstop: () => void;
    ondone: () => void;
  }>();

  let now = $state(Date.now());

  // Відлік від абсолютного часу (endAt), а не декремент лічильника:
  // тротлінг фонових вкладок не «заморожує» таймер.
  $effect(() => {
    if (endAt === null) return;
    now = Date.now();
    const id = setInterval(() => {
      now = Date.now();
    }, 250);
    return () => clearInterval(id);
  });

  const remaining = $derived(endAt === null ? 0 : remainingSec(endAt, now));
  const pct = $derived(
    endAt === null || total <= 0 ? 0 : Math.min(100, Math.round((remaining / total) * 100)),
  );

  // Завершення — рівно один раз на конкретний endAt (пауза/сон не дублюють сигнал).
  let firedFor: number | null = null;
  $effect(() => {
    if (endAt === null) return;
    if (remaining === 0 && firedFor !== endAt) {
      firedFor = endAt;
      ondone();
    }
  });
</script>

{#if endAt !== null}
  <div
    class="rest-timer"
    role="timer"
    aria-live="polite"
    aria-label="Відпочинок {label}: {formatClock(remaining)}"
  >
    <div class="rt-info">
      <div class="rt-label">⏱ {label}</div>
      <div class="rt-clock">{formatClock(remaining)}</div>
    </div>
    <div class="rt-actions">
      <button class="rt-btn" onclick={() => onextend(15)}>+15с</button>
      <button class="rt-btn rt-stop" onclick={onstop} aria-label="Зупинити таймер">✕</button>
    </div>
    <div class="rt-bar"><div class="rt-fill" style="width:{pct}%"></div></div>
  </div>
{/if}
