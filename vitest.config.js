import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['js/**/*.js'],
      exclude: [
        'js/filters.js', // Too large, needs separate testing strategy
        'js/cropping.js', // Too large, needs separate testing strategy
        'js/decorations.js', // Too large, needs separate testing strategy
        'node_modules/**',
        'tests/**'
      ],
      all: true,
      lines: 60,
      functions: 60,
      branches: 60,
      statements: 60
    },
    setupFiles: ['./tests/setup.js']
  }
});
