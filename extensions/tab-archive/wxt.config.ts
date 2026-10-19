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
    // tabs: URL とタイトルを読んで閉じる / alarms: 定期の整理 / favicon: 一覧のアイコン
    permissions: ['tabs', 'storage', 'alarms', 'favicon'],
    action: {
      default_title: '__MSG_actionTitle__',
    },
    omnibox: {
      keyword: 'ar',
    },
  },
});
