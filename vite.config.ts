import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const client = fileURLToPath(new URL('./client/', import.meta.url));

export default defineConfig({
  root: client,
  build: {
    outDir: fileURLToPath(new URL('./dist/client/', import.meta.url)),
    emptyOutDir: true,
    // three.js makes the TV bundle ~650 kB. That is fine over a home LAN.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // index.html is the phone controller (the URL people type), tv.html is the big screen.
      input: { index: client + 'index.html', tv: client + 'tv.html' },
    },
  },
});
