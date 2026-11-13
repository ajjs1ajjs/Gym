<script lang="ts">
  import { formatDateLabel, todayStr } from '../lib/dates';

  let {
    selectedDate,
    today = todayStr(),
    onnavigate,
    onpick,
    ontoday,
  } = $props<{
    selectedDate: string;
    today?: string;
    onnavigate: (delta: number) => void;
    onpick: (date: string) => void;
    ontoday: () => void;
  }>();

  let picker: HTMLInputElement | undefined = $state();

  function showPicker(): void {
    // PWA-001: showPicker кидає в непідтримуваних браузерах — прихований
    // нативний інпут і так відкривається тапом.
    try {
      picker?.showPicker();
    } catch {
      picker?.focus();
      picker?.click();
    }
  }
</script>

<div class="date-nav" id="date-nav">
  <button type="button" class="dn-btn" onclick={() => onnavigate(-1)} aria-label="Попередній день">◀</button>
  <button type="button" class="dn-date" aria-label="Обрати дату" onclick={showPicker}>
    {formatDateLabel(selectedDate)}
  </button>
  <button type="button" class="dn-btn" onclick={() => onnavigate(1)} aria-label="Наступний день">▶</button>
  <input
    type="date"
    class="dn-picker"
    aria-label="Дата тренування"
    bind:this={picker}
    max={today}
    value={selectedDate}
    onchange={(e) => onpick((e.currentTarget as HTMLInputElement).value)}
  />
  {#if selectedDate !== today}
    <button type="button" class="dn-btn dn-today" onclick={ontoday}>📅 Сьогодні</button>
  {/if}
</div>
