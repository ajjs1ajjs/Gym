<script lang="ts">
  import { todayStr, formatDate } from '../lib/dates';
  import { computeWeightDiffs } from '../lib/compute';
  import { toWeight } from '../lib/format';
  import type { WeightEntry } from '../lib/compute';

  let {
    weights,
    onadd,
    onupdate,
    ondelete,
  } = $props<{
    weights: WeightEntry[];
    onadd: (weight: number, date: string) => void;
    onupdate: (id: number, weight: number, date: string) => void;
    ondelete: (id: number) => void;
  }>();

  let open = $state(true);
  let wInput = $state('');
  let wDate = $state(todayStr());
  let editId = $state<number | null>(null);
  let error = $state('');

  const current = $derived(weights.length > 0 ? weights[0]?.weight : null);
  const prev = $derived(weights.length > 1 ? weights[1]?.weight : null);
  const diff = $derived(current !== null && prev !== null ? Math.round((current - prev) * 10) / 10 : null);
  const min = $derived(weights.length > 0 ? Math.min(...weights.map((w: WeightEntry) => w.weight)) : null);
  const max = $derived(weights.length > 0 ? Math.max(...weights.map((w: WeightEntry) => w.weight)) : null);
  const diffs = $derived(computeWeightDiffs(weights));

  function submit(): void {
    const weight = toWeight(wInput);
    if (weight === null) {
      error = 'Введіть коректну вагу';
      return;
    }
    if (!wDate) {
      error = 'Виберіть дату';
      return;
    }
    error = '';
    if (editId !== null) {
      onupdate(editId, weight, wDate);
      editId = null;
    } else {
      onadd(weight, wDate);
    }
    wInput = '';
    wDate = todayStr();
  }

  function startEdit(id: number): void {
    const w = weights.find((x: WeightEntry) => x.id === id);
    if (!w) return;
    wInput = String(w.weight);
    wDate = w.date;
    editId = id;
  }

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

<div class="block block-weight">
  <div class="block-header" role="button" tabindex="0" onclick={toggle} onkeydown={onKeydown}>
    <div class="icon" style="background:var(--accent4);color:#000">⚖️</div>
    <div class="title">Вага</div>
    <div class="arrow" class:open>▾</div>
  </div>
  <div class="block-body" class:open id="weight-section">
    <div class="weight-summary">
      {#if current !== null}
        <div class="weight-stat">
          <div class="val">{current}</div>
          <div class="label">Поточна вага</div>
        </div>
        {#if diff !== null}
          <div class="weight-stat {diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">
            <div class="val">{diff > 0 ? '+' : ''}{diff}</div>
            <div class="label">Зміна</div>
          </div>
        {/if}
        <div class="weight-stat">
          <div class="val">{min}</div>
          <div class="label">Мінімум</div>
        </div>
        <div class="weight-stat">
          <div class="val">{max}</div>
          <div class="label">Максимум</div>
        </div>
      {:else}
        <div class="weight-stat" style="flex:2">
          <div class="val" style="font-size:0.9rem">—</div>
          <div class="label">Додайте перше вимірювання</div>
        </div>
      {/if}
    </div>

    <div class="weight-form">
      <input
        type="number"
        id="w-input"
        placeholder="Вага (кг)"
        step="0.1"
        min="20"
        max="300"
        inputmode="decimal"
        bind:value={wInput}
        onkeydown={(e) => e.key === 'Enter' && submit()}
      />
      <input type="date" id="w-date" bind:value={wDate} />
      <button class="btn-add" id="w-add" onclick={submit}>{editId !== null ? '✎ Зберегти' : '+ Додати'}</button>
    </div>

    {#if weights.length > 0}
      {#each weights as w, i (w.id)}
        {@const wDiff = diffs[i]}
        <div class="weight-entry" data-id={w.id}>
          <span class="w-date">{formatDate(w.date)}</span>
          <span class="w-val">{w.weight} кг</span>
          {#if wDiff !== null && wDiff !== undefined}
            <span class="w-diff {wDiff > 0 ? 'pos' : wDiff < 0 ? 'neg' : 'zero'}">
              {wDiff > 0 ? '+' : ''}{wDiff.toFixed(1)}
            </span>
          {/if}
          <div class="w-actions">
            <button class="w-btn w-btn-edit" onclick={() => startEdit(w.id)}>✎</button>
            <button class="w-btn w-btn-del" onclick={() => ondelete(w.id)}>✕</button>
          </div>
        </div>
      {/each}
    {/if}

    {#if error}
      <div class="weight-error">{error}</div>
    {/if}
  </div>
</div>
