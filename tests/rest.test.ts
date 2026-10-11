import { describe, expect, it } from 'vitest';
import { formatClock, remainingSec } from '../src/lib/rest';

describe('remainingSec', () => {
  it('ceils partial seconds', () => {
    expect(remainingSec(10_000, 8_500)).toBe(2);
    expect(remainingSec(10_000, 9_999)).toBe(1);
  });

  it('never goes negative', () => {
    expect(remainingSec(10_000, 10_000)).toBe(0);
    expect(remainingSec(10_000, 11_000)).toBe(0);
  });

  it('handles non-finite input as zero', () => {
    expect(remainingSec(NaN, 1000)).toBe(0);
    expect(remainingSec(1000, NaN)).toBe(0);
    expect(remainingSec(Infinity, 0)).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats mm:ss with padded seconds', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('clamps zero and garbage to 0:00', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(NaN)).toBe('0:00');
  });
});
