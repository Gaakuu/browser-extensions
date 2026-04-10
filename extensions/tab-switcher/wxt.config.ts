import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tab Switcher',
    description: 'VSCode風のMRU順タブスイッチャー',
    permissions: ['tabs'],
    commands: {
      'show-tab-switcher': {
        suggested_key: {
          default: 'Ctrl+Shift+Space',
          mac: 'Command+Shift+Space',
        },
        description: 'タブ切り替えオーバーレイを表示',
      },
      'search-tabs': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P',
        },
        description: 'タブ検索オーバーレイを表示',
      },
    },
  },
});
