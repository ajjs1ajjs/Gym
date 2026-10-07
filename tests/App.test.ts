import '@testing-library/jest-dom/vitest';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '../src/App.svelte';
import { shiftDate, todayStr } from '../src/lib/dates';

const V2 = 'gym-tracker-progress-v2';

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
    expect(document.querySelector('.progress-text')?.textContent).toContain('1/10');
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
    expect(document.querySelector('.progress-text')?.textContent).toContain('1/10');
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
    expect(document.querySelector('.progress-text')?.textContent).toContain('0/10');
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
