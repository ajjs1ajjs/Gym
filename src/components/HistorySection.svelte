<script lang="ts">
  import { formatDate, isValidDateEntry } from '../lib/dates';
  import { getAllKeys } from '../lib/workout';
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

  let open = $state(true);
  const allKeys = getAllKeys();
  const total = allKeys.length;
  const dates = $derived(
    Object.keys(all)
      .filter((d) => isValidDateEntry(all[d]))
      .sort()
      .reverse(),
  );

  function toggle(): void {
    open = !open;
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<div class="block block-history">
  <div class="block-header" role="button" tabindex="0" onclick={toggle} onkeydown={onKeydown}>
    <div class="icon" style="background:var(--accent7);color:#fff">📋</div>
    <div class="title">Історія тренувань</div>
    <div class="arrow" class:open>▾</div>
  </div>
  <div class="block-body" class:open id="history-section">
    {#if dates.length === 0}
      <div class="history-empty">Ще немає записів тренувань</div>
    {:else}
      {#each dates as d (d)}
        {@const progress = all[d] ?? {}}
        {@const done = allKeys.filter((k) => progress[k]).length}
        {@const pct = total > 0 ? Math.round((done / total) * 100) : 0}
        {@const isSel = d === selectedDate}
        <div
          class="history-entry"
          class:history-curr={isSel}
          role="button"
          tabindex="0"
          onclick={() => onselect(d)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onselect(d);
            }
          }}
        >
          <span class="h-date">{formatDate(d)}</span>
          <div class="h-bar"><div class="h-fill" style="width:{pct}%"></div></div>
          <span class="h-pct">{done}/{total} · {pct}%</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
