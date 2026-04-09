import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tab Switcher',
    description: 'Arc-style tab switcher with MRU ordering and screenshot previews',
    permissions: ['tabs', 'activeTab', 'storage'],
    commands: {
      'show-tab-switcher': {
        suggested_key: {
          default: 'Ctrl+Shift+Space',
          mac: 'Command+Shift+Space',
        },
        description: 'Show tab switcher overlay',
      },
    },
  },
});
