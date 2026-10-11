import '@testing-library/jest-dom/vitest';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '../src/App.svelte';
import { shiftDate, todayStr } from '../src/lib/dates';
import { createBackup } from '../src/lib/backup';

const V2 = 'gym-tracker-progress-v2';
const WEIGHTS = 'gym-tracker-weights';
const EX_WEIGHTS_V2 = 'gym-tracker-ex-weights-v2';

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

  it('toggles exercise via checkbox and persists full set count', async () => {
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    expect(cb).toBeTruthy();
    cb.click();
    await tick();

    const all = JSON.parse(localStorage.getItem(V2) ?? '{}');
    expect(all[todayStr()]).toHaveProperty('leg-press', 3);
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
  });

  it('marks partial sets via dots and completes by checkbox', async () => {
    render(App);
    const card = document.querySelector('.exercise') as HTMLElement; // leg-press
    const dots = card.querySelectorAll('.set-dot');
    expect(dots).toHaveLength(3);
    (dots[0] as HTMLButtonElement).click();
    await tick();
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('leg-press', 1);
    // Частково — ще не зараховано у прогрес дня.
    expect(document.querySelector('.progress-text')?.textContent).toContain(`0/${TOTAL}`);
    expect(card.classList.contains('partial')).toBe(true);
    (dots[1] as HTMLButtonElement).click();
    await tick();
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('leg-press', 2);
    (dots[2] as HTMLButtonElement).click();
    await tick();
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('leg-press', 3);
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
    // Повторний тап по заповненій крапці знімає її (2 з 3).
    (dots[2] as HTMLButtonElement).click();
    await tick();
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('leg-press', 2);
  });

  it('untoggles exercise and removes from storage', async () => {
    localStorage.setItem(
      V2,
      JSON.stringify({ [todayStr()]: { 'leg-press': 3, burpee: 3 } }),
    );
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    cb.click();
    await tick();

    const all = JSON.parse(localStorage.getItem(V2) ?? '{}');
    expect(all[todayStr()]).not.toHaveProperty('leg-press');
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
  });

  it('shows the last recorded exercise weight as a hint', () => {
    localStorage.setItem(
      EX_WEIGHTS_V2,
      JSON.stringify({ 'leg-press': [{ date: shiftDate(todayStr(), -3), weight: 120 }] }),
    );
    render(App);
    expect(document.body.textContent).toContain('120 кг');
    expect(document.body.textContent).toContain('останнє: 120 кг');
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
    localStorage.setItem(V2, JSON.stringify({ [todayStr()]: { burpee: 3 } }));
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
      progress: { [todayStr()]: { burpee: 3 } },
      weights: [{ id: 'w-1', date: todayStr(), weight: 80 }],
      exWeights: { 'leg-press': [{ date: todayStr(), weight: 100 }] },
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
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toHaveProperty('burpee', 3);
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

describe('App undo flows', () => {
  it('deletes a weight entry and can undo it', async () => {
    localStorage.setItem(
      WEIGHTS,
      JSON.stringify([{ id: 'w1', date: todayStr(), weight: 80 }]),
    );
    render(App);
    expect(document.querySelectorAll('.weight-entry')).toHaveLength(1);
    (document.querySelector('.w-btn-del') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelectorAll('.weight-entry')).toHaveLength(0);
    expect(document.querySelector('.toast')?.textContent).toContain('видалено');
    (document.getElementById('toast-undo') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelectorAll('.weight-entry')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(WEIGHTS) ?? '[]')).toHaveLength(1);
  });

  it('resets progress and can undo it', async () => {
    localStorage.setItem(V2, JSON.stringify({ [todayStr()]: { burpee: 3 } }));
    render(App);
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
    (document.getElementById('btn-reset') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('.progress-text')?.textContent).toContain(`0/${TOTAL}`);
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toBeUndefined();
    (document.getElementById('toast-undo') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('.progress-text')?.textContent).toContain(`1/${TOTAL}`);
    expect(JSON.parse(localStorage.getItem(V2) ?? '{}')[todayStr()]).toEqual({ burpee: 3 });
  });

  it('shows a toast when there is nothing to reset', async () => {
    render(App);
    (document.getElementById('btn-reset') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('.toast')?.textContent).toContain('немає прогресу');
  });
});

describe('App storage safety', () => {
  it('rolls back UI state when storage quota hits', async () => {
    // DATA-003: мутація до save + відкат, щоб UI не брехав.
    render(App);
    const cb = document.getElementById('cb-leg-press') as HTMLInputElement;
    // Усі записи протягом дії падають (не лише перший): mockImplementationOnce
    // на Linux-CI з'їдав інший виклик setItem, і save проходив повз мок.
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
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
