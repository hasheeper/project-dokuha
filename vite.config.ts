import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        appContainer: resolve(__dirname, 'containers/app.html'),
        tavernContainer: resolve(__dirname, 'containers/tavern.html'),
        liveStream: resolve(__dirname, 'apps/live-stream/index.html')
      }
    }
  }
});
