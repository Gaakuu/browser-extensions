import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TabSwitcherPopup } from './TabSwitcherPopup';

const tabs = [
  { title: 'Inbox - Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { title: 'Pull requests · GitHub', url: 'https://github.com/pulls' },
  { title: '設定', url: 'chrome://settings/' },
  { title: '新しいタブ', url: 'chrome://newtab/' },
  { title: 'Chrome ウェブストア', url: 'https://chromewebstore.google.com/' },
].map((t, i) => ({ ...t, id: i + 1, windowId: 1, index: i, favIconUrl: '' }));

const meta: Meta<typeof TabSwitcherPopup> = {
  component: TabSwitcherPopup,
  args: {
    tabs,
    mode: 'switcher',
    onSwitch: fn(),
    onCloseTab: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TabSwitcherPopup>;

export const Switcher: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('tab-card-2')).toHaveClass('Mui-selected');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(args.onSwitch).toHaveBeenCalledWith(3);
  },
};

export const Search: Story = {
  args: { mode: 'search' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('search-input'), 'newtab');
    await expect(canvas.queryByText('Inbox - Gmail')).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSwitch).toHaveBeenCalledWith(4);
  },
};
