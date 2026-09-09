// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const picomatchShim = fileURLToPath(new URL('./src/lib/picomatch-shim.mjs', import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://mezhdumusic.github.io',
  base: '/mezhdulabs/',
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
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
