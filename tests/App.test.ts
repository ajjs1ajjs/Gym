import '@testing-library/jest-dom/vitest';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from '../src/App.svelte';
import { todayStr } from '../src/lib/dates';

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
