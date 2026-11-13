<script lang="ts">
  import { formatDate, isValidDateEntry, isRealCalendarDate } from '../lib/dates';
  import { progressPct } from '../lib/compute';
  import { getAllKeys, isExerciseDone } from '../lib/workout';
  import type { AllProgress } from '../lib/storage';

  let {
    all,
    selectedDate,
    onselect,
  } = $props<{
    all: AllProgress;
    selectedDate: string;
    onselect: (date: string) => void;
  }>();

  const INITIAL_LIMIT = 14;
  let open = $state(true);
  let showAll = $state(false);
  const allKeys = getAllKeys();
  const total = allKeys.length;
  const dates = $derived(
    // LOGIC-002: реальна календарна дата (2024-02-30 більше не проходить).
    Object.keys(all)
      .filter((d) => isRealCalendarDate(d) && isValidDateEntry(all[d]))
      .sort()
      .reverse(),
  );
  const visibleDates = $derived(showAll ? dates : dates.slice(0, INITIAL_LIMIT));

  function toggle(): void {
    open = !open;
  }
</script>

<div class="block block-history">
  <button type="button" class="block-header" aria-expanded={open} aria-label="Історія тренувань: згорнути/розгорнути" onclick={toggle}>
    <div class="icon" style="background:var(--accent7);color:#fff">📋</div>
    <div class="title">Історія тренувань</div>
    <div class="arrow" class:open>▾</div>
  </button>
  <div class="block-body" class:open id="history-section">
    {#if dates.length === 0}
      <div class="history-empty">Ще немає записів тренувань</div>
    {:else}
      {#each visibleDates as d (d)}
        {@const progress = all[d] ?? {}}
        {@const done = allKeys.filter((k) => isExerciseDone(progress[k], k)).length}
        {@const pct = progressPct(done, total)}
        {@const isSel = d === selectedDate}
        <button
          type="button"
          class="history-entry"
          class:history-curr={isSel}
          aria-label="Тренування {formatDate(d)}: {done} з {total}"
          onclick={() => onselect(d)}
        >
          <span class="h-date">{formatDate(d)}</span>
          <div class="h-bar"><div class="h-fill" style="width:{pct}%"></div></div>
          <span class="h-pct">{done}/{total} · {pct}%</span>
        </button>
      {/each}
      {#if dates.length > INITIAL_LIMIT}
        <button type="button" class="btn history-more" onclick={() => (showAll = !showAll)}>
          {showAll ? 'Згорнути' : `Показати всю історію (${dates.length})`}
        </button>
      {/if}
    {/if}
  </div>
</div>
