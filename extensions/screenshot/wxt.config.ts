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
    permissions: [
      'activeTab',
      'clipboardWrite',
      'downloads',
      'offscreen',
      'scripting',
      'debugger',
      'storage',
    ],
    // 入れる前から開いていたタブにも Content Script を差し込めるように（Content Script と同じ範囲）
    host_permissions: ['<all_urls>'],
    // アイコンを押しても撮れるようにし、撮れないページではバッジで知らせる
    action: {
      default_title: '__MSG_commandCaptureScreenshot__',
    },
    commands: {
      'capture-screenshot': {
        suggested_key: {
          default: 'Ctrl+Shift+2',
          mac: 'Command+Shift+2',
        },
        description: '__MSG_commandCaptureScreenshot__',
      },
    },
  },
});
