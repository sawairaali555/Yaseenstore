import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  cacheDir: 'node_modules/.vite-marketplace',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, proxy: { '/api': 'http://localhost:5173' } },
  build: { outDir: 'dist-marketplace' },
});
