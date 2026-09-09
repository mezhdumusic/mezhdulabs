// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const picomatchShim = fileURLToPath(new URL('./src/lib/picomatch-shim.mjs', import.meta.url));

// https://astro.build/config
//
// `site`/`base` are intentionally left at their defaults (root) here.
// The GitHub Actions workflow (.github/workflows/astro.yml) overrides
// both via `astro build --site ... --base ...`, using the real values
// reported by GitHub Pages at deploy time. That keeps production correct
// automatically (including once a custom domain is attached) while local
// `npm run dev`/`npm run build` stay clean at the site root.
export default defineConfig({
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    resolve: {
      alias: {
        picomatch: picomatchShim,
      },
    },
  },
});
