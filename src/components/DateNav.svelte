<script lang="ts">
  import { formatDateLabel, todayStr } from '../lib/dates';

  let {
    selectedDate,
    onnavigate,
    onpick,
    ontoday,
  } = $props<{
    selectedDate: string;
    onnavigate: (delta: number) => void;
    onpick: (date: string) => void;
    ontoday: () => void;
  }>();

  let picker: HTMLInputElement | undefined = $state();
  const today = todayStr();

  function showPicker(): void {
    picker?.showPicker();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showPicker();
    }
  }
</script>

<div class="date-nav" id="date-nav">
  <button class="dn-btn" onclick={() => onnavigate(-1)} aria-label="Попередній день">◀</button>
  <span class="dn-date" role="button" tabindex="0" onclick={showPicker} onkeydown={onKeydown}>
    {formatDateLabel(selectedDate)}
  </span>
  <button class="dn-btn" onclick={() => onnavigate(1)} aria-label="Наступний день">▶</button>
  <input
    type="date"
    class="dn-picker"
    bind:this={picker}
    max={today}
    value={selectedDate}
    onchange={(e) => onpick((e.currentTarget as HTMLInputElement).value)}
  />
  {#if selectedDate !== today}
    <button class="dn-btn dn-today" onclick={ontoday}>📅 Сьогодні</button>
  {/if}
</div>
