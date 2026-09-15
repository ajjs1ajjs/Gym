<script lang="ts">
  import type { Exercise } from '../lib/workout';

  const IMG_RE = /^images\/[a-z0-9-]+\.svg$/;
  const FALLBACK_IMG = `${import.meta.env.BASE_URL}images/icon.svg`;

  let {
    exercise,
    done,
    weight,
    ontoggle,
    onpromptweight,
    onweight,
  } = $props<{
    exercise: Exercise;
    done: boolean;
    weight?: number;
    ontoggle: () => void;
    onpromptweight: () => void;
    onweight: (value: number) => void;
  }>();

  // Allowlisted, base-aware image URL — unknown values fall back to the icon.
  const safeImg = $derived(
    IMG_RE.test(exercise.img) ? `${import.meta.env.BASE_URL}${exercise.img}` : FALLBACK_IMG,
  );

  function changeWeight(delta: number): void {
    if (weight === undefined) return;
    // Floor at 0.5, never 0: a 0 weight would be interpreted as "remove the
    // setting" in App.setExWeight, silently deleting the user's weight.
    const next = Math.max(0.5, Math.round((weight + delta) * 10) / 10);
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
</script>

<div class="exercise" class:done={done}>
  <div class="ex-thumb"><img src={safeImg} alt={exercise.name} loading="lazy" onerror={onImgError} /></div>
  <div class="ex-info">
    <div class="ex-info-top">
      <div class="ex-name">{exercise.name}</div>
      <div class="ex-badge">{exercise.badge}</div>
    </div>
    <div class="ex-desc">{exercise.desc}</div>
    {#if exercise.hasWeight}
      {#if weight !== undefined}
        <div class="ex-weight">
          <button class="ew-btn" onclick={() => changeWeight(-2.5)} aria-label="Зменшити вагу">−</button>
          <span class="ew-val" role="button" tabindex="0" onclick={onpromptweight} onkeydown={onValKeydown}>{weight} кг</span>
          <button class="ew-btn" onclick={() => changeWeight(2.5)} aria-label="Збільшити вагу">+</button>
        </div>
      {:else}
        <div class="ex-weight">
          <button class="ew-btn ew-set" onclick={onpromptweight}>+ Вага</button>
        </div>
      {/if}
    {/if}
  </div>
  <div class="ex-check">
    <input type="checkbox" id="cb-{exercise.key}" checked={done} onchange={ontoggle} />
    <label for="cb-{exercise.key}">✓</label>
  </div>
</div>
