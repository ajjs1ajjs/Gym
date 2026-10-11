import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import RestTimer from '../src/components/RestTimer.svelte';

function props(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    endAt: Date.now() + 90_000,
    total: 90,
    label: 'Жим ногами',
    onextend: vi.fn(),
    onstop: vi.fn(),
    ondone: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('RestTimer', () => {
  it('renders nothing when no timer is active', () => {
    render(RestTimer, props({ endAt: null }));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('shows the label and mm:ss countdown', () => {
    render(RestTimer, props());
    const timer = screen.getByRole('timer');
    expect(timer.textContent).toContain('Жим ногами');
    expect(timer.textContent).toContain('1:30');
  });

  it('extends and stops via buttons', async () => {
    const onextend = vi.fn();
    const onstop = vi.fn();
    render(RestTimer, props({ onextend, onstop }));
    (screen.getByText('+15с') as HTMLButtonElement).click();
    expect(onextend).toHaveBeenCalledWith(15);
    (screen.getByLabelText('Зупинити таймер') as HTMLButtonElement).click();
    expect(onstop).toHaveBeenCalledTimes(1);
  });

  it('counts down against absolute time and fires ondone exactly once', async () => {
    vi.useFakeTimers();
    const ondone = vi.fn();
    render(RestTimer, props({ endAt: Date.now() + 5_000, total: 5, ondone }));
    expect(screen.getByRole('timer').textContent).toContain('0:05');

    await vi.advanceTimersByTimeAsync(3_000);
    await tick();
    expect(screen.getByRole('timer').textContent).toContain('0:02');

    await vi.advanceTimersByTimeAsync(5_000);
    await tick();
    expect(ondone).toHaveBeenCalledTimes(1);
    // Наступні тіки не дублюють сигнал (поки батько не зняв endAt).
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    expect(ondone).toHaveBeenCalledTimes(1);
  });
});
