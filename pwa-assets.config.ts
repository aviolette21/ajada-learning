import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: '#0e0f13' } },
    apple: { ...preset.apple, resizeOptions: { background: '#0e0f13' } },
  },
  images: ['public/logo.svg'],
});
