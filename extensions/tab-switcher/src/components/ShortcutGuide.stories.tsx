import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ShortcutGuide } from './ShortcutGuide';

const meta: Meta<typeof ShortcutGuide> = {
  component: ShortcutGuide,
};

export default meta;
type Story = StoryObj<typeof ShortcutGuide>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // ショートカットが表示される
    expect(await canvas.findByText('⌘+Shift+Space')).toBeInTheDocument();
    expect(canvas.getByText('⌘+Shift+P')).toBeInTheDocument();
    // chrome://extensions/shortcuts が表示される
    expect(canvas.getByText('chrome://extensions/shortcuts')).toBeInTheDocument();
    // DevTools コードブロックが表示される
    expect(canvas.getByTestId('devtools-code')).toBeInTheDocument();
    // コピーボタンが存在する
    const copyButton = canvas.getByRole('button', { name: /コピー/ });
    expect(copyButton).toBeInTheDocument();
    // コピーボタンをクリックすると「コピーしました！」に変わる
    await userEvent.click(copyButton);
    expect(await canvas.findByText('コピーしました！')).toBeInTheDocument();
  },
};

export const NoShortcutsSet: Story = {
  beforeEach: () => {
    const original = chrome.commands.getAll;
    chrome.commands.getAll = (() =>
      Promise.resolve([
        { name: 'show-tab-switcher', shortcut: '', description: 'タブ切り替えオーバーレイを表示' },
        { name: 'search-tabs', shortcut: '', description: 'タブ検索オーバーレイを表示' },
      ])) as typeof chrome.commands.getAll;
    return () => {
      chrome.commands.getAll = original;
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chips = await canvas.findAllByText('未設定');
    expect(chips).toHaveLength(2);
  },
};
