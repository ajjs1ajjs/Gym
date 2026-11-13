<script lang="ts">
  import { tick } from 'svelte';
  import { toWeight } from '../lib/format';

  let {
    open,
    title,
    initial,
    canClear = false,
    onclose,
    onclear,
  } = $props<{
    open: boolean;
    title: string;
    initial: number | null;
    canClear?: boolean;
    onclose: (value: number | null) => void;
    onclear?: () => void;
  }>();

  let dialogEl: HTMLDialogElement | undefined = $state();
  let inputEl: HTMLInputElement | undefined = $state();
  let value = $state('');
  let error = $state('');

  function confirmValue(): void {
    const w = toWeight(value);
    if (w === null) {
      error = 'Введіть коректну вагу (0.5 - 999)';
      return;
    }
    error = '';
    onclose(w);
  }

  // $effect (runs before onMount in Svelte 5) handles show/open/close; there is
  // no need for a duplicate onMount block.
  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      error = '';
      value = initial === null ? '' : String(initial);
      if (typeof dialogEl.showModal === 'function') {
        if (!dialogEl.open) dialogEl.showModal();
      } else {
        dialogEl.setAttribute('open', '');
      }
      void tick().then(() => {
        inputEl?.focus();
        inputEl?.select();
      });
    } else if (dialogEl.open || dialogEl.hasAttribute('open')) {
      if (typeof dialogEl.close === 'function') dialogEl.close();
      else dialogEl.removeAttribute('open');
    }
  });
</script>

<dialog id="weight-dialog" bind:this={dialogEl} oncancel={(e) => { e.preventDefault(); onclose(null); }}>
  <div class="dlg-title" id="dlg-title">{title}</div>
  <input
    type="number"
    id="dlg-input"
    bind:this={inputEl}
    aria-label="Вага в кілограмах"
    step="0.1"
    min="0.5"
    max="999"
    inputmode="decimal"
    placeholder="0.5"
    bind:value
    onkeydown={(e) => { error = ''; if (e.key === 'Enter') confirmValue(); }}
    oninput={() => error && (error = '')}
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? 'dlg-error' : undefined}
  />
  {#if error}<div id="dlg-error" class="dlg-error">{error}</div>{/if}
  <div class="dlg-actions">
    {#if canClear && onclear}
      <button type="button" class="btn btn-danger dlg-clear" id="dlg-clear" onclick={onclear}>Прибрати</button>
    {/if}
    <button type="button" class="btn" id="dlg-cancel" onclick={() => onclose(null)}>Скасувати</button>
    <button type="button" class="btn btn-primary" id="dlg-ok" onclick={confirmValue}>ОК</button>
  </div>
</dialog>
