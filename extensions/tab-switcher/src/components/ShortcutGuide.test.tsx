import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutGuide } from './ShortcutGuide';

// chrome.commands.getAll のモック
const mockGetAll = vi.fn<() => Promise<chrome.commands.Command[]>>();

// chrome.runtime.id のモック
Object.defineProperty(globalThis, 'chrome', {
  value: {
    commands: { getAll: mockGetAll },
    runtime: { id: 'test-extension-id-12345' },
    i18n: {
      getMessage: (key: string, substitutions?: string | string[]) => {
        const messages: Record<string, string> = {
          optionsTitle: 'Tab Switcher — Keyboard Shortcuts',
          currentShortcuts: 'Current Shortcuts',
          shortcutNotSet: 'Not set',
          changeShortcuts: 'Change Shortcuts',
          changeShortcutsDesc: 'You can change keyboard shortcuts from Chrome\'s shortcut settings page.',
          copyUrl: 'Copy',
          copiedUrl: 'Copied!',
          advancedCtrlTab: 'Advanced: Use Ctrl+Tab',
          advancedCtrlTabDesc: 'Ctrl+Tab is reserved by Chrome.',
          advancedCtrlTabSteps: 'Steps',
          advancedCtrlTabStep1: 'Open chrome://extensions',
          advancedCtrlTabStep2: `Open DevTools with ${Array.isArray(substitutions) ? substitutions[0] : substitutions ?? ''}`,
          advancedCtrlTabStep3: 'Paste the code below',
          advancedCtrlTabTradeoff: `Note: ${Array.isArray(substitutions) ? substitutions[0] : substitutions ?? ''}`,
          advancedCtrlTabAlternativeMac: 'Cmd+Opt+→/←',
          advancedCtrlTabAlternativeOther: 'Ctrl+Page Down/Up',
          devtoolsShortcutMac: 'Cmd+Opt+J',
          devtoolsShortcutOther: 'Ctrl+Shift+J',
        };
        return messages[key] ?? key;
      },
    },
  },
  writable: true,
});

describe('ShortcutGuide', () => {
  beforeEach(() => {
    mockGetAll.mockResolvedValue([
      {
        name: 'show-tab-switcher',
        shortcut: '⌘+Shift+Space',
        description: 'Show tab switcher overlay',
      },
      {
        name: 'search-tabs',
        shortcut: '⌘+Shift+P',
        description: 'Show tab search overlay',
      },
    ]);
  });

  it('現在のショートカット一覧を表示する', async () => {
    render(<ShortcutGuide />);

    expect(await screen.findByText('⌘+Shift+Space')).toBeInTheDocument();
    expect(screen.getByText('⌘+Shift+P')).toBeInTheDocument();
    expect(screen.getByText('Show tab switcher overlay')).toBeInTheDocument();
    expect(screen.getByText('Show tab search overlay')).toBeInTheDocument();
  });

  it('ショートカットが未設定の場合「Not set」と表示する', async () => {
    mockGetAll.mockResolvedValue([
      {
        name: 'show-tab-switcher',
        shortcut: '',
        description: 'Show tab switcher overlay',
      },
    ]);

    render(<ShortcutGuide />);

    expect(await screen.findByText('Not set')).toBeInTheDocument();
  });

  it('chrome://extensions/shortcuts の URL を表示する', async () => {
    render(<ShortcutGuide />);

    await screen.findByText('⌘+Shift+Space');
    expect(screen.getByText('chrome://extensions/shortcuts')).toBeInTheDocument();
  });

  it('コピーボタンをクリックするとクリップボードにコピーする', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<ShortcutGuide />);

    await screen.findByText('⌘+Shift+Space');
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith('chrome://extensions/shortcuts');
  });

  it('DevTools コンソール用のコードに拡張機能IDが含まれる', async () => {
    render(<ShortcutGuide />);

    await screen.findByText('⌘+Shift+Space');
    const codeBlock = screen.getByTestId('devtools-code');
    expect(codeBlock.textContent).toContain('test-extension-id-12345');
    expect(codeBlock.textContent).toContain('show-tab-switcher');
    expect(codeBlock.textContent).toContain('Ctrl+Tab');
    expect(codeBlock.textContent).toContain('search-tabs');
    expect(codeBlock.textContent).toContain('Ctrl+P');
  });
});
