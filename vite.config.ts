import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves from a subpath (/StoryMagic/), so set the base to match.
    // Without this, built asset URLs are root-relative and 404 on Pages (blank page).
    base: '/StoryMagic/',
    // STORYMAGIC_DEMO=true flips the app into zero-key Demo Mode at build time
    // (used for the public read-only demo site). Dev/preview can also use ?demo.
    define: {
      __DEMO_MODE__: JSON.stringify(process.env.STORYMAGIC_DEMO === 'true'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
