import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  integrations: [react()],
  output: 'static',
  base: process.env.BASE_PATH || '/',
  site: process.env.SITE_URL || 'https://orbia-bench.github.io',
  devToolbar: { enabled: false },
  // No leading underscore, so a Jekyll-built homepage copies the bundle as-is.
  build: { assets: 'assets-astro' },
});
