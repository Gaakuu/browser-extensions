import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  optimizeDeps: {
    include: [
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'react',
      'react-dom',
      'react-dom/client',
      'storybook/test',
    ],
  },
  test: {
    projects: [
      // ユニットテスト（.test.ts）
      {
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: './src/test/setup.ts',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      // Storybook テスト（play関数）
      {
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        optimizeDeps: {
          include: [
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'react',
            'react-dom',
            'react-dom/client',
            'storybook/test',
            '@storybook/addon-vitest/internal/test-utils',
          ],
        },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
