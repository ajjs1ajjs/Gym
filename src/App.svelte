<script lang="ts">
import { onMount } from 'svelte';
import ProgressHeader from './components/ProgressHeader.svelte';
import DateNav from './components/DateNav.svelte';
import WorkoutBlock from './components/WorkoutBlock.svelte';
import WeightSection from './components/WeightSection.svelte';
import HistorySection from './components/HistorySection.svelte';
import WeightDialog from './components/WeightDialog.svelte';
import RestTimer from './components/RestTimer.svelte';
import { WORKOUT, getAllKeys, getExerciseByKey, toSetCount, isExerciseDone } from './lib/workout';
import {
  loadAllProgress,
  saveAllProgress,
  loadWeights,
  saveWeights,
  loadExWeightHistory,
  saveExWeightHistory,
  replaceAllData,
  clearCorruptedStorage,
  StorageQuotaError,
  StorageRecoveryError,
  recoverImport,
  getStorageProblems,
  loadSoundEnabled,
  saveSoundEnabled,
  loadLastBackupAt,
  saveLastBackupAt,
  STORAGE_KEY,
  WEIGHT_KEY,
  EX_WEIGHT_V2_KEY,
  JOURNAL_KEY,
} from './lib/storage';
import { createBackup, parseBackup } from './lib/backup';
import { upsertExWeight, removeExWeight, resolveExWeight } from './lib/exweights';
import type { ExWeightHistory } from './lib/exweights';
import { playRestDoneTone } from './lib/rest';
import { todayStr, shiftDate, formatDate, formatDateLabel, isUsableDateStr } from './lib/dates';
import { byDateDesc, newWeightId } from './lib/compute';
import { MIN_WEIGHT, MAX_WEIGHT } from './lib/format';
import type { AllProgress } from './lib/storage';
import type { WeightEntry } from './lib/compute';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

recoverImport();
let today = $state(todayStr());
let selectedDate = $state(todayStr());
let all = $state<AllProgress>(loadAllProgress());
let weights = $state<WeightEntry[]>(loadWeights());
let exHistory = $state<ExWeightHistory>(loadExWeightHistory());
let toast = $state<{ msg: string; undo?: () => void; actionLabel?: string } | null>(null);
let dialog = $state<{ key: string; initial: number | null; canClear: boolean } | null>(null);
let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Лічильник примусового перемонтування блоків після відкату (див. persist).
let uiTick = $state(0);
// Таймер відпочинку: endAt — абсолютний час завершення (мс).
let restEndAt = $state<number | null>(null);
let restTotal = $state(0);
let restLabel = $state('');
let soundEnabled = $state(loadSoundEnabled());
let lastBackupAt = $state<string | null>(loadLastBackupAt());
let importInput: HTMLInputElement | undefined = $state();
let storageProblems = $state(getStorageProblems());

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
const doneCount = $derived(allKeys.filter((k) => isExerciseDone(progress[k], k)).length);
const sortedWeights = $derived([...weights].sort(byDateDesc));

function showToast(msg: string, undo?: () => void, actionLabel?: string, duration?: number): void {
  toast = { msg, undo, actionLabel };
  clearTimeout(toastTimer);
  // Дії мають довше вікно, щоб встигнути натиснути «Скасувати» / «Оновити».
  const ms = duration ?? (undo ? 6000 : 2200);
  toastTimer = setTimeout(() => (toast = null), ms);
}

function dismissToast(): void {
  clearTimeout(toastTimer);
  toast = null;
}

function runUndo(): void {
  const fn = toast?.undo;
  dismissToast();
  fn?.();
}

function persist(fn: () => void): boolean {
  // DATA-003: снапшот до мутації — при квоті відкочуємо, щоб UI не брехав
  // про збережене (раніше стан мутував, save падав, дані розходились).
  // Копії, а не ті самі референси: інакше Svelte не помітить повернення.
  // uiTick форсує перемонтування блоків: Svelte не пересинхронізує
  // user-toggled чекбокс, якщо стан повернувся до початкового в тому ж циклі.
  const snap = { all, weights, exHistory };
  try {
    fn();
    return true;
  } catch (e) {
    all = { ...snap.all };
    weights = [...snap.weights];
    exHistory = { ...snap.exHistory };
    uiTick += 1;
    if (e instanceof StorageQuotaError) showToast('Помилка збереження: сховище переповнене');
    else if (e instanceof StorageRecoveryError) showToast('Потрібно відновити пошкоджені дані');
    else throw e;
    storageProblems = getStorageProblems();
    return false;
  }
}

function reloadFromStorage(): void {
  all = loadAllProgress();
  weights = loadWeights();
  exHistory = loadExWeightHistory();
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

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

let wakeLock: WakeLockSentinelLike | null = null;
let wakeLockGeneration = 0;

/** Тримає екран увімкненим, поки йде відпочинок (якщо API доступне). */
async function acquireWakeLock(): Promise<void> {
  const generation = ++wakeLockGeneration;
  try {
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wl) return;
    const lock = await wl.request('screen');
    if (generation !== wakeLockGeneration || restEndAt === null || document.visibilityState !== 'visible') {
      await lock.release();
      return;
    }
    if (wakeLock) await wakeLock.release();
    wakeLock = lock;
  } catch {
    /* відмовлено/немає API — не критично */
  }
}

function releaseWakeLock(): void {
  wakeLockGeneration++;
  try {
    void wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
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
  void acquireWakeLock();
}

function extendRest(extra: number): void {
  if (restEndAt === null || !Number.isFinite(extra) || extra <= 0) return;
  restEndAt += extra * 1000;
  restTotal += extra;
}

function stopRest(): void {
  restEndAt = null;
  releaseWakeLock();
}

function finishRest(): void {
  const label = restLabel;
  restEndAt = null;
  releaseWakeLock();
  showToast(label ? `💪 Відпочинок завершено — ${label}` : '💪 Відпочинок завершено');
  vibrate([180, 90, 180]);
  if (soundEnabled) playRestDoneTone();
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Відпочинок завершено', { body: label || 'Час робити наступний підхід' });
    }
  } catch {
    /* unsupported */
  }
}

function toggleSound(): void {
  soundEnabled = !soundEnabled;
  saveSoundEnabled(soundEnabled);
  showToast(soundEnabled ? 'Звук таймера увімкнено' : 'Звук таймера вимкнено');
}

function exportData(): void {
  try {
    const json = createBackup({ progress: all, weights, exWeights: exHistory });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari: revoke одразу після click() може скасувати завантаження.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveLastBackupAt(today);
    lastBackupAt = today;
    showToast('Бекап завантажено');
  } catch {
    showToast('Не вдалося створити бекап');
  }
}

function exportDamagedData(): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(getStorageProblems(), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `gym-tracker-recovery-${today}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearBrokenData(): void {
  if (!confirm('Очистити пошкоджені дані сховища? Спочатку завантажте їх копію на випадок відновлення.')) return;
  clearCorruptedStorage();
  reloadFromStorage();
  storageProblems = getStorageProblems();
  showToast('Пошкоджені дані очищено');
}

function pickImport(): void {
  importInput?.click();
}

async function importData(e: Event): Promise<void> {
  const input = e.currentTarget as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (input) input.value = ''; // повторний вибір того самого файла
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('Файл бекапу завеликий (максимум 10 МБ)');
    return;
  }
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
  if (parsed.discarded > 0 && !confirm(
    `У бекапі є пошкоджені або зайві записи. Буде пропущено: ${parsed.discarded}. Продовжити з відновленням решти?`,
  )) return;
  if (Object.keys(storageProblems).length > 0 && !confirm(
    'Пошкоджені дані буде замінено. Спочатку завантажте їх копію кнопкою відновлення. Продовжити?',
  )) return;
  const hasData =
    Object.keys(all).length > 0 || weights.length > 0 || Object.keys(exHistory).length > 0;
  if (hasData && !confirm('Замінити всі поточні дані імпортованими?')) return;
  const data = parsed.data;
  const saved = persist(() => {
    replaceAllData(data);
    all = data.progress;
    weights = data.weights;
    exHistory = data.exWeights;
  });
  if (saved) {
    storageProblems = getStorageProblems();
    const days = Object.keys(data.progress).length;
    showToast(`Імпортовано: днів — ${days}, вимірювань — ${data.weights.length}`);
  }
}

  /** Записати кількість виконаних підходів (0 — прибрати відмітку). */
  function setSets(key: string, count: number): void {
    if (!isKnownKey(key)) return;
    const target = getExerciseByKey(key)?.sets ?? 1;
    const n = Math.max(0, Math.min(target, Math.floor(count)));
    const cur = all[selectedDate] ?? {};
    const next = { ...cur };
    if (n > 0) next[key] = n;
    else delete next[key];
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

  /** Чекбокс: «все виконано» / «зняти все» (сумісність зі старим UX). */
  function toggleExercise(key: string): void {
    if (!isKnownKey(key)) return;
    const target = getExerciseByKey(key)?.sets ?? 1;
    const done = toSetCount(all[selectedDate]?.[key], key) >= target;
    setSets(key, done ? 0 : target);
  }

  function setExWeight(key: string, value: number): void {
    if (!isKnownKey(key) || !isValidEntryWeight(value)) return;
    persist(() => {
      exHistory = upsertExWeight(exHistory, key, selectedDate, value);
      saveExWeightHistory(exHistory);
    });
  }

  function openWeightPrompt(key: string): void {
    const view = resolveExWeight(exHistory, key, selectedDate);
    dialog = { key, initial: view.current, canClear: view.currentDate === selectedDate };
  }

  function closeWeightPrompt(value: number | null): void {
    if (dialog && value !== null) setExWeight(dialog.key, value);
    dialog = null;
  }

  function clearDialogWeight(): void {
    if (!dialog) return;
    const key = dialog.key;
    dialog = null;
    persist(() => {
      exHistory = removeExWeight(exHistory, key, selectedDate);
      saveExWeightHistory(exHistory);
    });
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
    const date = selectedDate;
    const day = all[date];
    if (!day || Object.keys(day).length === 0) {
      showToast('На цей день немає прогресу');
      return;
    }
    const label = date === todayStr() ? 'сьогодні' : formatDate(date);
    const rest = { ...all };
    delete rest[date];
    const saved = persist(() => {
      saveAllProgress(rest);
      all = rest;
    });
    if (!saved) return;
    // LOGIC-003: лишаємось на скинутому дні (раніше стрибало на сьогодні).
    showToast(`Прогрес скинуто (${label})`, () => {
      persist(() => {
        all = { ...all, [date]: day };
        saveAllProgress(all);
      });
    });
  }

  function addWeight(weight: number, date: string): boolean {
    if (!isValidEntryWeight(weight) || !isUsableDateStr(date)) {
      showToast('Некоректні дані вимірювання');
      return false;
    }
    return persist(() => {
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

  function updateWeight(id: string, weight: number, date: string): boolean {
    if (!isValidEntryWeight(weight) || !isUsableDateStr(date)) {
      showToast('Некоректні дані вимірювання');
      return false;
    }
    const existingIdx = weights.findIndex((w) => w.id === id);
    if (existingIdx < 0) return false;
    if (weights.some((w) => w.id !== id && w.date === date)) {
      showToast('На цю дату вже є запис');
      return false;
    }
    return persist(() => {
      // LOGIC-001: зміна дати на зайняту створювала б дублікат (інваріант
      // addWeight — одна дата = один запис). Забороняємо зі зрозумілою помилкою.
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
    const idx = weights.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const entry = weights[idx] as WeightEntry;
    const saved = persist(() => {
      weights = weights.filter((w) => w.id !== id);
      saveWeights(weights);
    });
    if (!saved) return;
    showToast('Запис видалено', () => {
      persist(() => {
        const insertIdx = weights.findIndex((w) => w.date < entry.date);
        weights = insertIdx >= 0
          ? [...weights.slice(0, insertIdx), entry, ...weights.slice(insertIdx)]
          : [...weights, entry];
        saveWeights(weights);
      });
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
    const syncToday = () => {
      const cur = todayStr();
      if (cur !== today) {
        if (selectedDate === today) selectedDate = cur;
        today = cur;
      }
    };
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      deferredPrompt = null;
      showToast('Дякуємо за встановлення!');
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === null ||
        e.key === STORAGE_KEY ||
        e.key === WEIGHT_KEY ||
        e.key === EX_WEIGHT_V2_KEY ||
        e.key === JOURNAL_KEY
      ) {
        reloadFromStorage();
        storageProblems = getStorageProblems();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncToday();
        if (restEndAt !== null && restEndAt > Date.now()) {
          void acquireWakeLock();
        }
      }
    };
    const onAppError = (e: Event) => {
      showToast((e as CustomEvent<string>).detail || 'Сталася помилка');
    };
    const onAppUpdate = () => {
      showToast('Доступне оновлення застосунку', () => window.location.reload(), 'Оновити', 10_000);
    };
    const midnightTimer = setInterval(syncToday, 60_000);
    window.addEventListener('app-error', onAppError);
    window.addEventListener('app-update', onAppUpdate);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', syncToday);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(midnightTimer);
      releaseWakeLock();
      window.removeEventListener('app-error', onAppError);
      window.removeEventListener('app-update', onAppUpdate);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', syncToday);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<ProgressHeader done={doneCount} {total} />

{#if Object.keys(storageProblems).length > 0}
  <div role="alert" class="storage-warning">
    Дані сховища пошкоджені або відновлення імпорту не завершене. Збереження призупинено.
    Завантажте копію та відновіть дані з бекапу.
    <div class="storage-warning-actions">
      <button type="button" class="btn" onclick={exportDamagedData}>Завантажити пошкоджені дані</button>
      <button type="button" class="btn btn-danger" onclick={clearBrokenData}>Очистити пошкоджені дані</button>
    </div>
  </div>
{/if}

<DateNav {selectedDate} {today} onnavigate={navigateDate} onpick={pickDate} ontoday={() => (selectedDate = today)} />

<main id="blocks">
  {#key uiTick}
  {#each WORKOUT as block, i (block.title)}
    <WorkoutBlock
      block={block}
      index={i}
      progress={progress}
      exHistory={exHistory}
      date={selectedDate}
      ontoggle={toggleExercise}
      onpromptweight={openWeightPrompt}
      onweight={setExWeight}
      onstartrest={startRest}
      onsetsets={setSets}
    />
  {/each}
  {/key}
</main>

<WeightSection
  weights={sortedWeights}
  {today}
  onadd={addWeight}
  onupdate={updateWeight}
  ondelete={deleteWeight}
/>

<HistorySection all={all} selectedDate={selectedDate} onselect={pickDate} />

<div class="actions">
  {#if deferredPrompt}
    <button type="button" class="btn btn-install" id="btn-install" onclick={installApp}>📲 Встановити</button>
  {/if}
  <button type="button" class="btn" id="btn-export" onclick={exportData}>⬇️ Експорт</button>
  <button type="button" class="btn" id="btn-import" onclick={pickImport}>⬆️ Імпорт</button>
  <input
    type="file"
    id="import-file"
    class="import-input"
    accept=".json,application/json"
    aria-label="Імпортувати файл бекапу"
    bind:this={importInput}
    onchange={importData}
  />
  <button type="button" class="btn btn-danger" id="btn-reset" onclick={resetProgress}>✕ Скинути прогрес</button>
</div>
<div class="backup-meta">
  {#if lastBackupAt}
    Останній бекап: {formatDateLabel(lastBackupAt)}
  {:else}
    Дані зберігаються локально на пристрої — регулярно експортуйте бекап
  {/if}
</div>

<WeightDialog
  open={dialog !== null}
  title="Вага (кг)"
  initial={dialog?.initial ?? null}
  canClear={dialog?.canClear ?? false}
  onclose={closeWeightPrompt}
  onclear={clearDialogWeight}
/>

<RestTimer
  endAt={restEndAt}
  total={restTotal}
  label={restLabel}
  {soundEnabled}
  onextend={extendRest}
  onstop={stopRest}
  ondone={finishRest}
  ontogglesound={toggleSound}
/>

{#if toast}
  <div class="toast show" class:above={restEndAt !== null} role="status">
    <span>{toast.msg}</span>
    {#if toast.undo}
      <button type="button" class="toast-undo" id="toast-undo" onclick={runUndo}>{toast.actionLabel ?? 'Скасувати'}</button>
    {/if}
  </div>
{/if}
