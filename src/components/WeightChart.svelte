<script lang="ts">
  import { buildSparkline } from '../lib/compute';
  import { formatDate } from '../lib/dates';
  import type { WeightEntry } from '../lib/compute';

  /** Спадаючий список (як у WeightSection). Показуємо останні 30 вимірювань. */
  let { weights } = $props<{ weights: WeightEntry[] }>();

  const MAX_POINTS = 30;
  const W = 300;
  const H = 84;

  const series = $derived(
    [...weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_POINTS),
  );
  const spark = $derived(buildSparkline(series.map((w) => w.weight), W, H));
  const firstDate = $derived(series[0]?.date ?? '');
  const lastDate = $derived(series[series.length - 1]?.date ?? '');
</script>

{#if spark && series.length > 1}
  <div class="weight-chart">
    <svg
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label="Графік ваги: від {spark.min} до {spark.max} кг за {series.length} вимірювань"
    >
      <path class="sp-area" d={spark.area} />
      {#if series.length > 1}
        <path class="sp-line" d={spark.line} vector-effect="non-scaling-stroke" />
      {/if}
      {#if spark.last}
        <circle class="sp-dot" cx={spark.last.x} cy={spark.last.y} r="3.5" />
      {/if}
    </svg>
    <div class="sp-labels">
      <span>{formatDate(firstDate)}</span>
      <span>мін {spark.min} · макс {spark.max} кг</span>
      <span>{formatDate(lastDate)}</span>
    </div>
  </div>
{/if}
