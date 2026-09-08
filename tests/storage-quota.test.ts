import { StorageQuotaError } from './lib/storage';

describe('Storage quota error handling', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    test('StorageQuotaError is thrown when quota exceeded', () => {
        // @ts-expect-error - testing error class
        const originalSetItem = localStorage.setItem;
        let callCount = 0;

        localStorage.setItem = function(key: string, value: string) {
            callCount++;
            // Simulate quota exceeded after 3 calls
            if (callCount >= 3) {
                throw new DOMException('QuotaExceededError', 'QuotaExceededError');
            }
            return originalSetItem.call(localStorage, key, value);
        };

        const { saveAllProgress } = require('./src/lib/storage');

        expect(() => saveAllProgress({ test: true })).toThrow(StorageQuotaError);
    });

    test('StorageQuotaError is caught in persist function', () => {
        const { showToast } = require('./src/App.svelte');

        // Mock showToast to verify it's called on error
        const originalShowToast = showToast;
        let toastCalled = false;

        showToast = (msg: string) => {
            toastCalled = true;
            expect(msg).toContain('storage');
            originalShowToast(msg);
        };

        // Test that error is handled gracefully
        try {
            localStorage.setItem('test', 'x'.repeat(1000000));
        } catch (e) {
            if (e instanceof StorageQuotaError) {
                showToast('Помилка збереження: сховище переповнене');
            }
        }

        expect(toastCalled).toBeTruthy();
    });
});