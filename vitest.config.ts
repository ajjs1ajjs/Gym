import { defineConfig, defaultExclude } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    // Playwright E2E живе в tests/e2e — його запускає окремий раннер.
    exclude: [...defaultExclude, 'tests/e2e/**'],
  },
});
