<script lang="ts">
  import ExerciseCard from './ExerciseCard.svelte';
  import { toSetCount, isExerciseDone } from '../lib/workout';
  import { resolveExWeight, exWeightHint } from '../lib/exweights';
  import type { WorkoutBlock as Block, Exercise } from '../lib/workout';
  import type { DayProgress as Day } from '../lib/storage';
  import type { ExWeightHistory } from '../lib/exweights';

  let {
    block,
    index,
    progress,
    exHistory,
    date,
    ontoggle,
    onpromptweight,
    onweight,
    onstartrest,
    onsetsets,
  } = $props<{
    block: Block;
    index: number;
    progress: Day;
    exHistory: ExWeightHistory;
    date: string;
    ontoggle: (key: string) => void;
    onpromptweight: (key: string) => void;
    onweight: (key: string, value: number) => void;
    onstartrest: (key: string) => void;
    onsetsets: (key: string, count: number) => void;
  }>();

  const ACCENTS: ReadonlySet<string> = new Set(['block-0', 'block-1', 'block-2', 'block-3']);
  const accent = $derived(ACCENTS.has(block.accent) ? block.accent : 'block-0');
  const bodyId = $derived(`block-body-${index}`);

  let open = $state(true);
  const blockDone = $derived(
    block.exercises.filter((e: Exercise) => isExerciseDone(progress[e.key], e.key)).length,
  );
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

<div class="block {accent}">
  <div
    class="block-header"
    role="button"
    tabindex="0"
    aria-expanded={open}
    aria-controls={bodyId}
    onclick={toggle}
    onkeydown={onKeydown}
  >
    <div class="icon">{block.icon}</div>
    <div class="title">{block.title}</div>
    <div class="block-progress">{blockDone}/{blockTotal}</div>
    <div class="arrow" class:open>▾</div>
  </div>
  <div id={bodyId} class="block-body" class:open>
    <div class="block-desc">{block.desc}</div>
    {#each block.exercises as ex (ex.key)}
      {@const view = resolveExWeight(exHistory, ex.key, date)}
      <ExerciseCard
        exercise={ex}
        completed={toSetCount(progress[ex.key], ex.key)}
        weight={view.current ?? undefined}
        weightHint={exWeightHint(view, date)}
        ontoggle={() => ontoggle(ex.key)}
        onpromptweight={() => onpromptweight(ex.key)}
        onweight={(value) => onweight(ex.key, value)}
        onstartrest={() => onstartrest(ex.key)}
        onsetsets={(count) => onsetsets(ex.key, count)}
      />
    {/each}
  </div>
</div>
