<script lang="ts">
  import type { Exercise } from '../lib/workout';
  import { MIN_WEIGHT, MAX_WEIGHT } from '../lib/format';

  const IMG_RE = /^images\/[a-z0-9-]+\.svg$/;
  const FALLBACK_IMG = `${import.meta.env.BASE_URL}images/icon.svg`;

  let {
    exercise,
    completed,
    weight,
    weightHint,
    ontoggle,
    onpromptweight,
    onweight,
    onstartrest,
    onsetsets,
  } = $props<{
    exercise: Exercise;
    /** Виконано підходів (0..sets). */
    completed: number;
    weight?: number;
    weightHint?: string | null;
    ontoggle: () => void;
    onpromptweight: () => void;
    onweight: (value: number) => void;
    onstartrest: () => void;
    onsetsets: (count: number) => void;
  }>();

  const isDone = $derived(completed >= exercise.sets);
  const isPartial = $derived(completed > 0 && !isDone);
  const setIndexes = $derived(Array.from({ length: exercise.sets }, (_, i) => i + 1));

  // Allowlisted, base-aware image URL — unknown values fall back to the icon.
  const safeImg = $derived(
    IMG_RE.test(exercise.img) ? `${import.meta.env.BASE_URL}${exercise.img}` : FALLBACK_IMG,
  );

  function changeWeight(delta: number): void {
    if (weight === undefined) return;
    // Floor at 0.5, never 0: a 0 weight would be interpreted as "remove the
    // setting" in App.setExWeight, silently deleting the user's weight.
    // Ceiling at MAX_WEIGHT: over-limit clicks no longer vanish silently
    // in App's guard (LOGIC: visible no-op at the cap instead).
    const next = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round((weight + delta) * 10) / 10));
    onweight(next);
  }

  function onImgError(e: Event): void {
    const img = e.currentTarget as HTMLImageElement | null;
    if (img && img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
  }

  function onValKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onpromptweight();
    }
  }

  function toggleSet(n: number): void {
    // Тап по вже заповненій крапці знімає її; інакше — заповнює до неї.
    onsetsets(completed >= n ? n - 1 : n);
  }
</script>

<div class="exercise" class:done={isDone} class:partial={isPartial}>
  <div class="ex-thumb"><img src={safeImg} alt={exercise.name} loading="lazy" onerror={onImgError} /></div>
  <div class="ex-info">
    <div class="ex-info-top">
      <div class="ex-name">{exercise.name}</div>
      <div class="ex-badge">{exercise.badge}</div>
    </div>
    <div class="ex-desc">{exercise.desc}</div>
    {#if exercise.sets > 1}
      <div class="ex-sets" role="group" aria-label="Підходи: {completed} з {exercise.sets}">
        {#each setIndexes as n (n)}
          <button
            type="button"
            class="set-dot"
            class:filled={n <= completed}
            aria-label="Підхід {n} з {exercise.sets}"
            aria-pressed={n <= completed}
            onclick={() => toggleSet(n)}
          ></button>
        {/each}
      </div>
    {/if}
    {#if exercise.hasWeight || exercise.rest}
      <div class="ex-weight">
        {#if exercise.hasWeight}
          {#if weight !== undefined}
            <button class="ew-btn" onclick={() => changeWeight(-2.5)} aria-label="Зменшити вагу">−</button>
            <span class="ew-val" role="button" tabindex="0" onclick={onpromptweight} onkeydown={onValKeydown}>{weight} кг</span>
            <button class="ew-btn" onclick={() => changeWeight(2.5)} aria-label="Збільшити вагу">+</button>
          {:else}
            <button class="ew-btn ew-set" onclick={onpromptweight}>+ Вага</button>
          {/if}
        {/if}
        {#if exercise.rest}
          <button
            class="ew-btn ew-set ew-timer"
            onclick={onstartrest}
            aria-label="⏱ {exercise.rest}с — таймер відпочинку, {exercise.rest} секунд"
          >⏱ {exercise.rest}с</button>
        {/if}
      </div>
    {/if}
    {#if weightHint}
      <div class="ex-hint">{weightHint}</div>
    {/if}
  </div>
  <div class="ex-check">
    <input type="checkbox" id="cb-{exercise.key}" checked={isDone} onchange={ontoggle} />
    <label for="cb-{exercise.key}" aria-label="Позначити всі підходи">✓</label>
  </div>
</div>
