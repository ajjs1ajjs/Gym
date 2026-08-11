<script lang="ts">
  import { toWeight } from '../lib/format';

  let {
    open,
    title,
    initial,
    onclose,
  } = $props<{
    open: boolean;
    title: string;
    initial: number | null;
    onclose: (value: number | null) => void;
  }>();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let value = $state('');

  function confirmValue(): void {
    const w = toWeight(value);
    if (w === null) return;
    onclose(w);
  }

  // $effect (runs before onMount in Svelte 5) handles show/open/close; there is
  // no need for a duplicate onMount block.
  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      value = initial === null ? '' : String(initial);
      dialogEl.showModal();
      dialogEl.focus();
    } else if (dialogEl.open) {
      dialogEl.close();
    }
  });
</script>

<dialog id="weight-dialog" bind:this={dialogEl} oncancel={(e) => { e.preventDefault(); onclose(null); }}>
  <div class="dlg-title" id="dlg-title">{title}</div>
  <input
    type="number"
    id="dlg-input"
    step="0.5"
    min="0.5"
    inputmode="decimal"
    placeholder="0.5"
    bind:value
    onkeydown={(e) => e.key === 'Enter' && confirmValue()}
  />
  <div class="dlg-actions">
    <button type="button" class="btn" id="dlg-cancel" onclick={() => onclose(null)}>Скасувати</button>
    <button type="button" class="btn btn-primary" id="dlg-ok" onclick={confirmValue}>ОК</button>
  </div>
</dialog>
