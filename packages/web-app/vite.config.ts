import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@oss-vat/shared-core': path.resolve(__dirname, '../shared-core/src/index.ts'),
      '@oss-vat/oss-calculator': path.resolve(__dirname, '../oss-calculator/src/index.ts'),
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
