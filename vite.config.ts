/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/ajada-learning/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Ajada Learning',
        short_name: 'Ajada',
        description: 'Study for the Claude Certified Developer – Foundations (CCDV-F) exam.',
        theme_color: '#0e0f13',
        background_color: '#0e0f13',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ajada-learning/',
        scope: '/ajada-learning/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff2}'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./tests/stubs/pwa-register.ts', import.meta.url)),
    },
  },
});
