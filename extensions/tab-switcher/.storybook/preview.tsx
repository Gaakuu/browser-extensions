import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider, darkTheme } from '@browser-extensions/ui';
import jaMessages from '../src/public/_locales/ja/messages.json';

// Storybook 環境で chrome.i18n をモック
// ブラウザの Chrome では chrome オブジェクトは存在するが i18n は拡張機能コンテキストでしか使えない
{
  const messages: Record<string, { message: string; placeholders?: Record<string, { content: string }> }> =
    jaMessages;

  const getMessage = (key: string, substitutions?: string | string[]) => {
    const entry = messages[key];
    if (!entry) return key;
    let msg = entry.message;
    if (entry.placeholders) {
      const subs = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : [];
      // Chrome i18n: メッセージ中の $PLACEHOLDER_NAME$ を placeholders[name].content ($1, $2, ...) 経由で置換
      for (const [name, ph] of Object.entries(entry.placeholders)) {
        const index = Number.parseInt(ph.content.replace(/\$/g, '')) - 1;
        const value = subs[index] ?? ph.content;
        msg = msg.replace(new RegExp(`\\$${name}\\$`, 'gi'), value);
      }
    }
    return msg;
  };

  const commandsMock = {
    getAll: () =>
      Promise.resolve([
        { name: 'show-tab-switcher', shortcut: '⌘+Shift+Space', description: 'タブ切り替えオーバーレイを表示' },
        { name: 'search-tabs', shortcut: '⌘+Shift+P', description: 'タブ検索オーバーレイを表示' },
      ]),
  };

  const runtimeMock = {
    id: 'sample-extension-id-12345',
  };

  if (typeof globalThis.chrome === 'undefined') {
    globalThis.chrome = { i18n: { getMessage }, commands: commandsMock, runtime: runtimeMock } as typeof chrome;
  } else {
    globalThis.chrome.i18n = { getMessage } as typeof chrome.i18n;
    globalThis.chrome.commands = commandsMock as typeof chrome.commands;
    globalThis.chrome.runtime = { ...globalThis.chrome.runtime, ...runtimeMock } as typeof chrome.runtime;
  }
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
