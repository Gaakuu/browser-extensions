import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: {
    dirsScanOptions: {
      fileFilter: (file) => !/\.(stories|test|spec)\.(ts|tsx)$/.test(file),
    },
  },
  runner: {
    chromiumArgs: ['--disable-blink-features=AutomationControlled'],
  },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // tabs: タイトルと URL を読む / storage: MRU の順番を session に置く / favicon: chrome:// などのアイコン
    // Content Script は使わない（chrome:// や新しいタブでは差し込めず、動かなかったため）
    permissions: ['tabs', 'storage', 'favicon'],
    action: {
      default_title: '__MSG_extName__',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+Space',
          mac: 'Command+Shift+Space',
        },
        description: '__MSG_commandShowTabSwitcher__',
      },
      'previous-tab': {
        suggested_key: {
          default: 'Alt+Q',
          mac: 'MacCtrl+Q',
        },
        description: '__MSG_commandPreviousTab__',
      },
      'search-tabs': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P',
        },
        description: '__MSG_commandSearchTabs__',
      },
    },
  },
});
