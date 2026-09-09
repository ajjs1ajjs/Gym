<script lang="ts">
import { onMount } from 'svelte';
import ProgressHeader from './components/ProgressHeader.svelte';
import DateNav from './components/DateNav.svelte';
import WorkoutBlock from './components/WorkoutBlock.svelte';
import WeightSection from './components/WeightSection.svelte';
import HistorySection from './components/HistorySection.svelte';
import WeightDialog from './components/WeightDialog.svelte';
import { WORKOUT, getAllKeys } from './lib/workout';
import {
  loadAllProgress,
  saveAllProgress,
  loadWeights,
  saveWeights,
  loadExWeights,
  saveExWeights,
  StorageQuotaError,
  STORAGE_KEY,
  WEIGHT_KEY,
  EX_WEIGHT_KEY,
} from './lib/storage';
import { todayStr, shiftDate, formatDate } from './lib/dates';
import { byDateDesc } from './lib/compute';
import type { AllProgress } from './lib/storage';
import type { WeightEntry } from './lib/compute';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_VERSION_KEY = 'gym-tracker-version';

function getVersion(): number {
  const v = localStorage.getItem(STORAGE_VERSION_KEY);
  return v ? parseInt(v, 10) : 0;
}

function setVersion(v: number): void {
  localStorage.setItem(STORAGE_VERSION_KEY, String(v));
}

let selectedDate = $state(todayStr());
let all = $state<AllProgress>(loadAllProgress());
let weights = $state<WeightEntry[]>(loadWeights());
let exWeights = $state<Record<string, number>>(loadExWeights());
let toastMsg = $state('');
let dialog = $state<{ key: string; initial: number | null } | null>(null);
let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const allKeys = getAllKeys();
const total = allKeys.length;

const progress = $derived(all[selectedDate] ?? {});
const doneCount = $derived(allKeys.filter((k) => progress[k]).length);
const sortedWeights = $derived([...weights].sort(byDateDesc));

function showToast(msg: string): void {
  toastMsg = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg = ''), 2000);
}

function persist(fn: () => void): void {
  try {
    fn();
    setVersion(getVersion() + 1);
  } catch (e) {
    if (e instanceof StorageQuotaError) showToast('Помилка збереження: сховище переповнене');
    else throw e;
  }
}

function reloadFromStorage(): void {
  all = loadAllProgress();
  weights = loadWeights();
  exWeights = loadExWeights();
}

  function toggleExercise(key: string): void {
    const cur = all[selectedDate] ?? {};
    const next = { ...cur };
    if (next[key]) delete next[key];
    else next[key] = true;
    persist(() => {
      if (Object.keys(next).length > 0) all = { ...all, [selectedDate]: next };
      else {
        const rest = { ...all };
        delete rest[selectedDate];
        all = rest;
      }
      saveAllProgress(all);
    });
  }

  function setExWeight(key: string, value: number): void {
    persist(() => {
      const next = { ...exWeights };
      if (value < 0) delete next[key];
      else next[key] = value;
      exWeights = next;
      saveExWeights(next);
    });
  }

  function openWeightPrompt(key: string): void {
    dialog = { key, initial: exWeights[key] ?? null };
  }

  function closeWeightPrompt(value: number | null): void {
    if (dialog && value !== null) setExWeight(dialog.key, value);
    dialog = null;
  }

  function navigateDate(delta: number): void {
    const nd = shiftDate(selectedDate, delta);
    if (nd > todayStr()) return;
    selectedDate = nd;
  }

  function resetProgress(): void {
    const label = selectedDate === todayStr() ? 'сьогодні' : formatDate(selectedDate);
    if (!confirm(`Скинути прогрес на ${label}?`)) return;
    const rest = { ...all };
    delete rest[selectedDate];
    try {
      persist(() => saveAllProgress(rest));
      all = rest;
    } catch (_e /* eslint-disable-line @typescript-eslint/no-unused-vars */) {
      showToast('Помилка скидання прогресу');
      return;
    }
    selectedDate = todayStr();
    showToast('Прогрес скинуто');
  }

  function addWeight(weight: number, date: string): void {
    persist(() => {
      const existingIdx = weights.findIndex((w) => w.date === date);
      const existingEntry = existingIdx >= 0 ? weights[existingIdx] : undefined;
      const entry: WeightEntry = { id: existingEntry?.id ?? Date.now(), date, weight };
      if (existingIdx >= 0) {
        weights = [...weights.slice(0, existingIdx), entry, ...weights.slice(existingIdx + 1)];
      } else {
        const insertIdx = weights.findIndex((w) => w.date < date);
        weights = insertIdx >= 0
          ? [...weights.slice(0, insertIdx), entry, ...weights.slice(insertIdx)]
          : [...weights, entry];
      }
      saveWeights(weights);
    });
  }

  function updateWeight(id: number, weight: number, date: string): void {
    persist(() => {
      const existingIdx = weights.findIndex((w) => w.id === id);
      if (existingIdx < 0) return;
      const entry: WeightEntry = { id, date, weight };
      // Remove old, insert at correct position
      const without = [...weights.slice(0, existingIdx), ...weights.slice(existingIdx + 1)];
      const insertIdx = without.findIndex((w) => w.date < date);
      weights = insertIdx >= 0
        ? [...without.slice(0, insertIdx), entry, ...without.slice(insertIdx)]
        : [...without, entry];
      saveWeights(weights);
    });
  }

  function deleteWeight(id: number): void {
    if (!confirm('Видалити запис?')) return;
    persist(() => {
      weights = weights.filter((w) => w.id !== id);
      saveWeights(weights);
    });
  }

  async function installApp(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') showToast('Додаток встановлено!');
    deferredPrompt = null;
  }

  onMount(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      deferredPrompt = null;
      showToast('Дякуємо за встановлення!');
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === WEIGHT_KEY || e.key === EX_WEIGHT_KEY) {
        // Note: storage event fires after the write, so version should be updated
        reloadFromStorage();
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
    };
  });
</script>

<ProgressHeader done={doneCount} {total} />

<DateNav {selectedDate} onnavigate={navigateDate} onpick={(d) => (selectedDate = d)} ontoday={() => (selectedDate = todayStr())} />

<main id="blocks">
  {#each WORKOUT as block (block.title)}
    <WorkoutBlock
      block={block}
      progress={progress}
      exWeights={exWeights}
      ontoggle={toggleExercise}
      onpromptweight={openWeightPrompt}
      onweight={setExWeight}
    />
  {/each}
</main>

<WeightSection
  weights={sortedWeights}
  onadd={addWeight}
  onupdate={updateWeight}
  ondelete={deleteWeight}
/>

<HistorySection all={all} selectedDate={selectedDate} onselect={(d) => (selectedDate = d)} />

<div class="actions">
  {#if deferredPrompt}
    <button class="btn btn-install" id="btn-install" onclick={installApp}>📲 Встановити</button>
  {/if}
  <button class="btn btn-danger" id="btn-reset" onclick={resetProgress}>✕ Скинути прогрес</button>
</div>

<WeightDialog open={dialog !== null} title="Вага (кг)" initial={dialog?.initial ?? null} onclose={closeWeightPrompt} />

<div class="toast" class:show={toastMsg !== ''}>{toastMsg}</div>
