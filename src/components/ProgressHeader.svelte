<script lang="ts">
  import { progressPct } from '../lib/compute';

  let { done, total } = $props<{ done: number; total: number }>();
  const pct = $derived(progressPct(done, total));
</script>

<header>
  <h1>🏋️ Gym <span>Tracker</span></h1>
  <div class="subtitle">Щоденне тренування</div>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" style="width:{pct}%"></div>
    </div>
    <div class="progress-text">{done}/{total} · {pct}%</div>
  </div>
</header>
