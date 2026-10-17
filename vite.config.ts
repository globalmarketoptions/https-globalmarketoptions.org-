import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const standaloneBuild = Boolean(process.env.VERCEL) || process.env.APPDEPLOY !== '1';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: standaloneBuild
    ? {
        alias: {
          '@appdeploy/client': fileURLToPath(new URL('./src/appdeploy-client.ts', import.meta.url)),
        },
      }
    : undefined,
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap:
      process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    rollupOptions: {
      maxParallelFileOps: 128,
    },
  },
});
