import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173/ajada-learning/', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/ajada-learning/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testIgnore: /offline/, grepInvert: /@chromium/ },
    { name: 'cards-chromium', use: { ...devices['Pixel 7'] }, testIgnore: /offline/, grep: /@chromium/ },
    { name: 'offline-chromium', use: { ...devices['Pixel 7'] }, testMatch: /offline/ },
  ],
});
