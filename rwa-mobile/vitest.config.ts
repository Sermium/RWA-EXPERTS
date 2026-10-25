import { defineConfig } from 'vitest/config';

// Unit tests for pure TypeScript modules (wallet crypto). Expo native modules are mocked per test.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
