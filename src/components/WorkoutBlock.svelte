<script lang="ts">
  import ExerciseCard from './ExerciseCard.svelte';
  import type { WorkoutBlock as Block, Exercise } from '../lib/workout';
  import type { DayProgress as Day } from '../lib/storage';

  let {
    block,
    progress,
    exWeights,
    ontoggle,
    onpromptweight,
    onweight,
  } = $props<{
    block: Block;
    progress: Day;
    exWeights: Record<string, number>;
    ontoggle: (key: string) => void;
    onpromptweight: (key: string) => void;
    onweight: (key: string, value: number) => void;
  }>();

  let open = $state(true);
  const blockDone = $derived(block.exercises.filter((e: Exercise) => progress[e.key]).length);
  const blockTotal = $derived(block.exercises.length);

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

<div class="block {block.accent}">
  <div
    class="block-header"
    role="button"
    tabindex="0"
    onclick={toggle}
    onkeydown={onKeydown}
  >
    <div class="icon">{block.icon}</div>
    <div class="title">{block.title}</div>
    <div class="block-progress">{blockDone}/{blockTotal}</div>
    <div class="arrow" class:open>▾</div>
  </div>
  <div class="block-body" class:open>
    <div class="block-desc">{block.desc}</div>
    {#each block.exercises as ex (ex.key)}
      <ExerciseCard
        exercise={ex}
        done={!!progress[ex.key]}
        weight={exWeights[ex.key]}
        ontoggle={() => ontoggle(ex.key)}
        onpromptweight={() => onpromptweight(ex.key)}
        onweight={(value) => onweight(ex.key, value)}
      />
    {/each}
  </div>
</div>
