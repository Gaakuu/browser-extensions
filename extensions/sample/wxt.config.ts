import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Sample Extension',
    description: 'サンプルのブラウザ拡張機能',
    permissions: ['storage'],
  },
});
