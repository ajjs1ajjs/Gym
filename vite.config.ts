import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // Absolute subpath: the app is served from /dist/gym/ on GitHub Pages
        // (public dist repo hosts the built PWA; the source repo is private).
        navigateFallback: '/dist/gym/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.(?:svg|png)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gym-images',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  base: '/dist/gym/',
  resolve: {
    conditions: ['browser'],
  },
  // Vitest config lives in vitest.config.ts (kept out of the app bundle config).
});
