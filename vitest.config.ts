import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    css: { include: [/src[\\/]site[\\/].+\.css/] },
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/game/**', 'src/site/**', 'src/render/**'],
      exclude: ['src/render/renderer.ts', 'src/render/ground.ts', 'src/render/effects.ts', 'src/game/audio.ts'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
