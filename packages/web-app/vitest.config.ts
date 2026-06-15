import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@oss-vat/shared-core': path.resolve(__dirname, '../shared-core/src/index.ts'),
      '@oss-vat/oss-calculator': path.resolve(__dirname, '../oss-calculator/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
