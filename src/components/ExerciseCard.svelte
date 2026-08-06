<script lang="ts">
  import type { Exercise } from '../lib/workout';

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

  function changeWeight(delta: number): void {
    if (weight === undefined) return;
    const next = Math.max(0, Math.round((weight + delta) * 10) / 10);
    onweight(next);
  }

  function onValKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onpromptweight();
    }
  }
</script>

<div class="exercise" class:done={done}>
  <div class="ex-thumb"><img src={exercise.img} alt={exercise.name} loading="lazy" /></div>
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
