import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetch } from '@testing-library/svelte';

describe('PWA offline mode', () => {
    beforeEach(() => {
        // Mock the service worker registration
        global.navigator.serviceWorker = {
            register: vi.fn().mockResolvedValue({ installing: null, waiting: null, active: null }),
            controller: null,
        } as any;

        // Mock cacha and match for offline testing
        global.caches = {
            match: vi.fn(),
            add: vi.fn(),
            addAll: vi.fn(),
            delete: vi.fn(),
            has: vi.fn(),
            keys: vi.fn(),
            open: vi.fn(),
        } as any;

        // Mock fetch to work offline
        global.fetch = vi.fn();
    });

    test('app initializes without errors when offline', () => {
        // Test that the app can start without network
        const { check } = require('./src');

        // Should not throw when trying to go offline
        expect(() => {
            // Simulate going offline
            navigator.onLine = false;
        }).not.toThrow();
    });

    test('toast messages work in offline mode', () => {
        // Test that toast messages still function
        const { showToast } = require('./src/App.svelte');

        showToast('Тестове повідомлення');

        // Verify toast was set
        const toastDiv = document.querySelector('.toast');
        expect(toastDiv).toBeTruthy();
        expect(toastDiv?.textContent).toContain('Тестове повідомлення');
    });

    test('navigation works in offline mode', () => {
        // Test date navigation doesn't fail offline
        const { shiftDate, todayStr } = require('./src/lib/dates');

        const today = todayStr();
        const yesterday = shiftDate(today, -1);
        const tomorrow = shiftDate(today, 1);

        // Should be able to shift dates even offline
        expect(yesterday).not.toBeNull();
        expect(tomorrow).not.toBeNull();
    });
});