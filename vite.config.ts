/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import eslint from '@nabla/vite-plugin-eslint';
import checker from 'vite-plugin-checker';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint(),
    checker({
      typescript: {
        tsconfigPath: './tsconfig.app.json',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    execArgv: ['--no-webstorage'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.{ts,tsx}'],
          setupFiles: ['./src/setupTests.ts', './src/setupIntegrationTests.ts'],
        },
      },
    ],
  },
});
