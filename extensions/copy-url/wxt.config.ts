import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: {
    dirsScanOptions: {
      fileFilter: (file) => !/\.(stories|test|spec)\.(ts|tsx)$/.test(file),
    },
  },
  runner: {
    chromiumArgs: ['--disable-blink-features=AutomationControlled'],
  },
  manifest: {
    name: 'Copy URL',
    description: '⌘⇧C で今のタブの URL をコピーする',
    // tabs: chrome:// を含むどのタブでも URL を読む / offscreen: Service Worker からクリップボードに書く
    // scripting + activeTab: コピーしたことをページの隅に小さく出す（ショートカットで押したタブだけ）
    permissions: ['tabs', 'offscreen', 'clipboardWrite', 'scripting', 'activeTab'],
    action: {
      default_title: '今のタブの URL をコピー',
    },
    commands: {
      'copy-url': {
        suggested_key: {
          default: 'Ctrl+Shift+C',
          mac: 'Command+Shift+C',
        },
        description: '今のタブの URL をコピー',
      },
    },
  },
});
