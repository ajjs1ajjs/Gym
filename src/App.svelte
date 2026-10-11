<script lang="ts">
import { onMount } from 'svelte';
import ProgressHeader from './components/ProgressHeader.svelte';
import DateNav from './components/DateNav.svelte';
import WorkoutBlock from './components/WorkoutBlock.svelte';
import WeightSection from './components/WeightSection.svelte';
import HistorySection from './components/HistorySection.svelte';
import WeightDialog from './components/WeightDialog.svelte';
import RestTimer from './components/RestTimer.svelte';
import { WORKOUT, getAllKeys, getExerciseByKey } from './lib/workout';
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
import { createBackup, parseBackup } from './lib/backup';
import { todayStr, shiftDate, formatDate, isUsableDateStr } from './lib/dates';
import { byDateDesc, newWeightId } from './lib/compute';
import { MIN_WEIGHT, MAX_WEIGHT } from './lib/format';
import type { AllProgress } from './lib/storage';
import type { WeightEntry } from './lib/compute';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let selectedDate = $state(todayStr());
let all = $state<AllProgress>(loadAllProgress());
let weights = $state<WeightEntry[]>(loadWeights());
let exWeights = $state<Record<string, number>>(loadExWeights());
let toastMsg = $state('');
let dialog = $state<{ key: string; initial: number | null } | null>(null);
let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Лічильник примусового перемонтування блоків після відкату (див. persist).
let uiTick = $state(0);
// Таймер відпочинку: endAt — абсолютний час завершення (мс).
let restEndAt = $state<number | null>(null);
let restTotal = $state(0);
let restLabel = $state('');
let importInput: HTMLInputElement | undefined = $state();

const allKeys = getAllKeys();
const knownKeys = new Set(allKeys);
const total = allKeys.length;

function isKnownKey(key: string): boolean {
  return knownKeys.has(key);
}

function isValidEntryWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight >= MIN_WEIGHT && weight <= MAX_WEIGHT;
}

const progress = $derived(all[selectedDate] ?? {});
const doneCount = $derived(allKeys.filter((k) => progress[k]).length);
const sortedWeights = $derived([...weights].sort(byDateDesc));

function showToast(msg: string): void {
  toastMsg = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMsg = ''), 2000);
}

function persist(fn: () => void): boolean {
  // DATA-003: снапшот до мутації — при квоті відкочуємо, щоб UI не брехав
  // про збережене (раніше стан мутував, save падав, дані розходились).
  // Копії, а не ті самі референси: інакше Svelte не помітить повернення.
  // uiTick форсує перемонтування блоків: Svelte не пересинхронізує
  // user-toggled чекбокс, якщо стан повернувся до початкового в тому ж циклі.
  const snap = { all, weights, exWeights };
  try {
    fn();
    return true;
  } catch (e) {
    all = { ...snap.all };
    weights = [...snap.weights];
    exWeights = { ...snap.exWeights };
    uiTick += 1;
    if (e instanceof StorageQuotaError) showToast('Помилка збереження: сховище переповнене');
    else throw e;
    return false;
  }
}

function reloadFromStorage(): void {
  all = loadAllProgress();
  weights = loadWeights();
  exWeights = loadExWeights();
}

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* API немає — не критично */
  }
}

function requestNotifyPermission(): void {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission()?.catch?.(() => {});
    }
  } catch {
    /* unsupported */
  }
}

function startRest(key: string): void {
  const ex = getExerciseByKey(key);
  const sec = ex?.rest ?? 0;
  if (!Number.isFinite(sec) || sec <= 0) return;
  restEndAt = Date.now() + sec * 1000;
  restTotal = sec;
  restLabel = ex?.name ?? '';
  vibrate(30);
  requestNotifyPermission();
}

function extendRest(extra: number): void {
  if (restEndAt === null || !Number.isFinite(extra) || extra <= 0) return;
  restEndAt += extra * 1000;
  restTotal += extra;
}

function stopRest(): void {
  restEndAt = null;
}

function finishRest(): void {
  const label = restLabel;
  restEndAt = null;
  showToast(label ? `💪 Відпочинок завершено — ${label}` : '💪 Відпочинок завершено');
  vibrate([180, 90, 180]);
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Відпочинок завершено', { body: label || 'Час робити наступний підхід' });
    }
  } catch {
    /* unsupported */
  }
}

function exportData(): void {
  try {
    const json = createBackup({ progress: all, weights, exWeights });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari: revoke одразу після click() може скасувати завантаження.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Бекап завантажено');
  } catch {
    showToast('Не вдалося створити бекап');
  }
}

function pickImport(): void {
  importInput?.click();
}

async function importData(e: Event): Promise<void> {
  const input = e.currentTarget as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (input) input.value = ''; // повторний вибір того самого файла
  if (!file) return;
  let text: string;
  try {
    text = await file.text();
  } catch {
    showToast('Не вдалося прочитати файл');
    return;
  }
  const parsed = parseBackup(text);
  if (!parsed.ok) {
    showToast(parsed.error);
    return;
  }
  const hasData =
    Object.keys(all).length > 0 || weights.length > 0 || Object.keys(exWeights).length > 0;
  if (hasData && !confirm('Замінити всі поточні дані імпортованими?')) return;
  const data = parsed.data;
  const saved = persist(() => {
    saveAllProgress(data.progress);
    saveWeights(data.weights);
    saveExWeights(data.exWeights);
    all = data.progress;
    weights = data.weights;
    exWeights = data.exWeights;
  });
  if (saved) {
    const days = Object.keys(data.progress).length;
    showToast(`Імпортовано: днів — ${days}, вимірювань — ${data.weights.length}`);
  }
}

  function toggleExercise(key: string): void {
    if (!isKnownKey(key)) return;
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
    if (!isKnownKey(key) || !isValidEntryWeight(value)) return;
    persist(() => {
      const next = { ...exWeights };
      next[key] = value;
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

  function pickDate(d: string): void {
    if (!isUsableDateStr(d)) {
      showToast('Некоректна дата');
      return;
    }
    selectedDate = d;
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
    // LOGIC-003: лишаємось на скинутому дні (раніше стрибало на сьогодні).
    showToast('Прогрес скинуто');
  }

  function addWeight(weight: number, date: string): void {
    if (!isValidEntryWeight(weight) || !isUsableDateStr(date)) {
      showToast('Некоректні дані вимірювання');
      return;
    }
    persist(() => {
      const existingIdx = weights.findIndex((w) => w.date === date);
      const existingEntry = existingIdx >= 0 ? weights[existingIdx] : undefined;
      const entry: WeightEntry = { id: existingEntry?.id ?? newWeightId(), date, weight };
      if (existingIdx >= 0) {
        weights = [...weights.slice(0, existingIdx), entry, ...weights.slice(existingIdx + 1)];
        // LOGIC-003: перезапис видно, а не мовчки.
        showToast('Запис за цю дату перезаписано');
      } else {
        const insertIdx = weights.findIndex((w) => w.date < date);
        weights = insertIdx >= 0
          ? [...weights.slice(0, insertIdx), entry, ...weights.slice(insertIdx)]
          : [...weights, entry];
      }
      saveWeights(weights);
    });
  }

  function updateWeight(id: string, weight: number, date: string): void {
    if (!isValidEntryWeight(weight) || !isUsableDateStr(date)) {
      showToast('Некоректні дані вимірювання');
      return;
    }
    persist(() => {
      const existingIdx = weights.findIndex((w) => w.id === id);
      if (existingIdx < 0) return;
      // LOGIC-001: зміна дати на зайняту створювала б дублікат (інваріант
      // addWeight — одна дата = один запис). Забороняємо зі зрозумілою помилкою.
      if (weights.some((w) => w.id !== id && w.date === date)) {
        showToast('На цю дату вже є запис');
        return;
      }
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

  function deleteWeight(id: string): void {
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
    const onAppError = (e: Event) => {
      showToast((e as CustomEvent<string>).detail || 'Сталася помилка');
    };
    window.addEventListener('app-error', onAppError);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('app-error', onAppError);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
    };
  });
</script>

<ProgressHeader done={doneCount} {total} />

<DateNav {selectedDate} onnavigate={navigateDate} onpick={pickDate} ontoday={() => (selectedDate = todayStr())} />

<main id="blocks">
  {#key uiTick}
  {#each WORKOUT as block, i (block.title)}
    <WorkoutBlock
      block={block}
      index={i}
      progress={progress}
      exWeights={exWeights}
      ontoggle={toggleExercise}
      onpromptweight={openWeightPrompt}
      onweight={setExWeight}
      onstartrest={startRest}
    />
  {/each}
  {/key}
</main>

<WeightSection
  weights={sortedWeights}
  onadd={addWeight}
  onupdate={updateWeight}
  ondelete={deleteWeight}
/>

<HistorySection all={all} selectedDate={selectedDate} onselect={pickDate} />

<div class="actions">
  {#if deferredPrompt}
    <button class="btn btn-install" id="btn-install" onclick={installApp}>📲 Встановити</button>
  {/if}
  <button class="btn" id="btn-export" onclick={exportData}>⬇️ Експорт</button>
  <button class="btn" id="btn-import" onclick={pickImport}>⬆️ Імпорт</button>
  <input
    type="file"
    id="import-file"
    class="import-input"
    accept=".json,application/json"
    bind:this={importInput}
    onchange={importData}
  />
  <button class="btn btn-danger" id="btn-reset" onclick={resetProgress}>✕ Скинути прогрес</button>
</div>

<WeightDialog open={dialog !== null} title="Вага (кг)" initial={dialog?.initial ?? null} onclose={closeWeightPrompt} />

<RestTimer
  endAt={restEndAt}
  total={restTotal}
  label={restLabel}
  onextend={extendRest}
  onstop={stopRest}
  ondone={finishRest}
/>

<div class="toast" class:show={toastMsg !== ''} class:above={restEndAt !== null}>{toastMsg}</div>
