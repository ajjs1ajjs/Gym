<script lang="ts">
  let { done, total } = $props<{ done: number; total: number }>();
</script>

<header>
  <h1>🏋️ Gym <span>Tracker</span></h1>
  <div class="subtitle">Щоденне тренування</div>
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" style="width:{total > 0 ? Math.round((done / total) * 100) : 0}%"></div>
    </div>
    <div class="progress-text">{done}/{total} · {total > 0 ? Math.round((done / total) * 100) : 0}%</div>
  </div>
</header>
