import { defineConfig } from 'wxt';

export default defineConfig({
  runner: {
    chromiumArgs: ['--disable-blink-features=AutomationControlled'],
  },
  manifest: {
    name: 'Sample Extension',
    description: 'サンプルのブラウザ拡張機能',
    permissions: ['storage'],
  },
});
