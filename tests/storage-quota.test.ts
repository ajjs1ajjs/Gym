import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAllProgress, StorageQuotaError } from '../src/lib/storage';

beforeEach(() => localStorage.clear());

describe('storage quota failures', () => {
  it('surfaces an actual quota failure from localStorage writes', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage) {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    try {
      expect(() => saveAllProgress({ '2026-01-01': { 'leg-press': 1 } }))
        .toThrow(StorageQuotaError);
    } finally {
      spy.mockRestore();
    }
    expect(localStorage.length).toBe(0);
  });
});
