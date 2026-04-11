import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider, darkTheme } from '@browser-extensions/ui';
import jaMessages from '../src/public/_locales/ja/messages.json';

// Storybook 環境で chrome.i18n をモック
{
  const messages: Record<string, { message: string; placeholders?: Record<string, { content: string }> }> =
    jaMessages;

  const getMessage = (key: string, substitutions?: string | string[]) => {
    const entry = messages[key];
    if (!entry) return key;
    let msg = entry.message;
    if (substitutions && entry.placeholders) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      for (const [, ph] of Object.entries(entry.placeholders)) {
        const index = Number.parseInt(ph.content.replace('$', '')) - 1;
        if (subs[index] !== undefined) {
          msg = msg.replace(ph.content, subs[index]);
        }
      }
    }
    return msg;
  };

  if (typeof globalThis.chrome === 'undefined') {
    globalThis.chrome = { i18n: { getMessage } } as typeof chrome;
  } else {
    globalThis.chrome.i18n = { getMessage } as typeof chrome.i18n;
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
