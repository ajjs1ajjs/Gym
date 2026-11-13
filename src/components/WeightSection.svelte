<script lang="ts">
  import { untrack } from 'svelte';
  import { todayStr, formatDate, isUsableDateStr } from '../lib/dates';
  import { computeWeightDiffs } from '../lib/compute';
  import { toWeight } from '../lib/format';
  import WeightChart from './WeightChart.svelte';
  import type { WeightEntry } from '../lib/compute';

  let {
    weights,
    today = todayStr(),
    onadd,
    onupdate,
    ondelete,
  } = $props<{
    weights: WeightEntry[];
    today?: string;
    onadd: (weight: number, date: string) => boolean;
    onupdate: (id: string, weight: number, date: string) => boolean;
    ondelete: (id: string) => void;
  }>();

  let open = $state(true);
  let wInput = $state('');
  let prevToday = untrack(() => today);
  let wDate = $state(untrack(() => today));
  let editId = $state<string | null>(null);
  let error = $state('');

  $effect(() => {
    if (today !== prevToday) {
      if (editId === null && wDate === prevToday) wDate = today;
      prevToday = today;
    }
  });

  const current = $derived(weights.length > 0 ? weights[0]?.weight : null);
  const prev = $derived(weights.length > 1 ? weights[1]?.weight : null);
  const diff = $derived(current !== null && prev !== null ? Math.round((current - prev) * 10) / 10 : null);
  const min = $derived(weights.length > 0 ? weights.reduce((m: number, w: WeightEntry) => Math.min(m, w.weight), Number.POSITIVE_INFINITY) : null);
  const max = $derived(weights.length > 0 ? weights.reduce((m: number, w: WeightEntry) => Math.max(m, w.weight), Number.NEGATIVE_INFINITY) : null);
  const diffs = $derived(computeWeightDiffs(weights));

  function submit(): void {
    const weight = toWeight(wInput);
    if (weight === null) {
      error = 'Введіть коректну вагу (0.5–999)';
      return;
    }
    if (!isUsableDateStr(wDate)) {
      error = 'Виберіть коректну дату (не в майбутньому)';
      return;
    }
    error = '';
    if (editId !== null) {
      if (!onupdate(editId, weight, wDate)) return;
      editId = null;
    } else {
      if (!onadd(weight, wDate)) return;
    }
    wInput = '';
    // LOGIC-003: обраний день не скидаємо (раніше втрачався після кожного додавання).
  }

  function cancelEdit(): void {
    // LOGIC-003: скасування редагування (раніше editId скидався тільки сабмітом).
    editId = null;
    wInput = '';
    error = '';
    wDate = today;
  }

  function startEdit(id: string): void {
    const w = weights.find((x: WeightEntry) => x.id === id);
    if (!w) return;
    wInput = String(w.weight);
    wDate = w.date;
    editId = id;
  }

  function handleDelete(id: string): void {
    if (editId === id) cancelEdit();
    ondelete(id);
  }

  function toggle(): void {
    open = !open;
  }
</script>

<div class="block block-weight">
  <button type="button" class="block-header" aria-expanded={open} aria-label="Вага: згорнути/розгорнути" onclick={toggle}>
    <div class="icon" style="background:var(--accent4);color:#000">⚖️</div>
    <div class="title">Вага</div>
    <div class="arrow" class:open>▾</div>
  </button>
  <div class="block-body" class:open id="weight-section">
    <div class="weight-summary">
      {#if current !== null}
        <div class="weight-stat">
          <div class="val">{current}</div>
          <div class="label">Поточна вага</div>
        </div>
        {#if diff !== null}
          <div class="weight-stat {diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">
            <div class="val">{diff > 0 ? '+' : ''}{diff.toFixed(1)}</div>
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

    {#if weights.length > 1}
      <WeightChart {weights} />
    {/if}

    <div class="weight-form">
      <input
        type="number"
        id="w-input"
        placeholder="Вага (кг)"
        aria-label="Вага в кілограмах"
        step="0.1"
        min="0.5"
        max="999"
        inputmode="decimal"
        bind:value={wInput}
        onkeydown={(e) => e.key === 'Enter' && submit()}
      />
      <input type="date" id="w-date" bind:value={wDate} max={today} aria-label="Дата вимірювання" />
      <button type="button" class="btn-add" id="w-add" onclick={submit}>{editId !== null ? '✎ Зберегти' : '+ Додати'}</button>
      {#if editId !== null}
        <button type="button" class="btn-cancel" id="w-cancel" onclick={cancelEdit} aria-label="Скасувати редагування">✕</button>
      {/if}
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
            <button type="button" class="w-btn w-btn-edit" aria-label="Редагувати запис" onclick={() => startEdit(w.id)}>✎</button>
            <button type="button" class="w-btn w-btn-del" aria-label="Видалити запис" onclick={() => handleDelete(w.id)}>✕</button>
          </div>
        </div>
      {/each}
    {/if}

    {#if error}
      <div class="weight-error">{error}</div>
    {/if}
  </div>
</div>
