import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['activeTab', 'clipboardWrite', 'downloads', 'offscreen'],
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
