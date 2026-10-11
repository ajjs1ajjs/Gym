import '@testing-library/jest-dom/vitest';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '../src/App.svelte';
import { shiftDate, todayStr } from '../src/lib/dates';
import { createBackup } from '../src/lib/backup';

const V2 = 'gym-tracker-progress-v2';
const WEIGHTS = 'gym-tracker-weights';

const TOTAL = 19;

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('renders all workout blocks and exercises', () => {
    render(App);
    expect(screen.getByText('Силовий блок')).toBeInTheDocument();
    expect(screen.getByText('Інтенсивний фінішер')).toBeInTheDocument();
    expect(screen.getByText('Блок для кору')).toBeInTheDocument();
    expect(screen.getByText('Бурпі')).toBeInTheDocument();
    expect(screen.getByText('Скакалка')).toBeInTheDocument();
    expect(screen.getByText('Гіперекстензія')).toBeInTheDocument();
    expect(screen.getByText('Ходьба з нахилом')).toBeInTheDocument();
  });

  it('toggles exercise and persists to localStorage', async () => {
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    expect(cb).toBeTruthy();
    cb.click();
    await tick();

    const all = JSON.parse(localStorage.getItem(V2) ?? '{}');
    expect(all[todayStr()]).toHaveProperty('leg-press', true);
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
  });

  it('untoggles exercise and removes from storage', async () => {
    localStorage.setItem(
      V2,
      JSON.stringify({ [todayStr()]: { 'leg-press': true, burpee: true } }),
    );
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    cb.click();
    await tick();

    const all = JSON.parse(localStorage.getItem(V2) ?? '{}');
    expect(all[todayStr()]).not.toHaveProperty('leg-press');
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
  });

  it('starts a rest timer from an exercise and can stop it', async () => {
    render(App);
    const btn = document.querySelector('.ew-timer') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    await tick();
    const timer = screen.getByRole('timer');
    expect(timer).toBeInTheDocument();
    expect(timer.textContent).toContain('1:30'); // перша вправа — 90 сек
    const stop = timer.querySelector('.rt-stop') as HTMLButtonElement;
    stop.click();
    await tick();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('exports a backup file', async () => {
    localStorage.setItem(V2, JSON.stringify({ [todayStr()]: { burpee: true } }));
    render(App);
    const createSpy = vi.fn(() => 'blob:mock');
    const revokeSpy = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { value: createSpy, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeSpy, configurable: true, writable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      (document.getElementById('btn-export') as HTMLButtonElement).click();
      await tick();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.toast')?.textContent).toContain('Бекап завантажено');
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', { value: origCreate, configurable: true, writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: origRevoke, configurable: true, writable: true });
    }
  });

  it('imports a backup and replaces the state', async () => {
    const backup = createBackup({
      progress: { [todayStr()]: { burpee: true } },
      weights: [{ id: 'w-1', date: todayStr(), weight: 80 }],
      exWeights: { 'leg-press': 100 },
    });
    render(App);
    const input = document.getElementById('import-file') as HTMLInputElement;
    const file = new File([backup], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.querySelector('.weight-entry')).not.toBeNull();
    });
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('burpee', true);
    expect(JSON.parse(localStorage.getItem(WEIGHTS) ?? '[]')).toHaveLength(1);
    // 100 кг підтягнулось у поле ваги вправи.
    expect(document.body.textContent).toContain('100 кг');
  });

  it('shows an error toast for an invalid import file', async () => {
    render(App);
    const input = document.getElementById('import-file') as HTMLInputElement;
    const file = new File(['not json at all'], 'bad.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.querySelector('.toast')?.textContent).toContain('коректним JSON');
    });
  });
});

describe('App storage safety', () => {
  it('rolls back UI state when storage quota hits', async () => {
    // DATA-003: мутація до save + відкат, щоб UI не брехав.
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    cb.click();
    await tick();
    await tick();
    spy.mockRestore();
    expect(localStorage.getItem(V2)).toBeNull();
    expect(document.querySelector('.toast')?.textContent).toContain('переповнене');
    expect(document.querySelector('.progress-text')?.textContent).toContain(`0/${TOTAL}`);
    // Вузол перемонтовано відкатом — перечитуємо, старий референс мертвий.
    const cb2 = document.getElementById('cb-leg-press') as HTMLInputElement;
    expect(cb2.checked).toBe(false);
  });

  it('blocks weight date collision on update', async () => {
    // LOGIC-001: одна дата = один запис.
    render(App);
    const input = document.getElementById('w-input') as HTMLInputElement;
    const date = document.getElementById('w-date') as HTMLInputElement;
    const add = document.getElementById('w-add') as HTMLButtonElement;
    const setVal = (el: HTMLInputElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const today = todayStr();
    const yesterday = shiftDate(today, -1);
    setVal(input, '80');
    setVal(date, today);
    add.click();
    await tick();
    setVal(input, '81');
    setVal(date, yesterday);
    add.click();
    await tick();
    expect(document.querySelectorAll('.weight-entry')).toHaveLength(2);
    // Редагуємо другий запис: переносимо на зайняту дату.
    const edits = document.querySelectorAll('.w-btn-edit');
    (edits[1] as HTMLButtonElement).click();
    await tick();
    setVal(date, today);
    (document.getElementById('w-add') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelectorAll('.weight-entry')).toHaveLength(2);
    expect(document.querySelector('.toast')?.textContent).toContain('вже є запис');
  });
});
