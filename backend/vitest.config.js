import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    testTimeout: 30000,
    hookTimeout: 180000,
    fileParallelism: false,
  },
});
