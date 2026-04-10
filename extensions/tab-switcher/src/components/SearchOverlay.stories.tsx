import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SearchOverlay } from './SearchOverlay';

const sampleTabs = [
  { id: 1, title: 'Gmail - Inbox', url: 'https://mail.google.com', favIconUrl: '', lastAccessed: Date.now() },
  { id: 2, title: 'GitHub - Pull Requests', url: 'https://github.com/pulls', favIconUrl: '', lastAccessed: Date.now() - 1000 },
  { id: 3, title: 'Slack - General', url: 'https://app.slack.com', favIconUrl: '', lastAccessed: Date.now() - 2000 },
  { id: 4, title: 'Notion - Workspace', url: 'https://notion.so', favIconUrl: '', lastAccessed: Date.now() - 3000 },
  { id: 5, title: 'YouTube', url: 'https://youtube.com', favIconUrl: '', lastAccessed: Date.now() - 4000 },
];

const meta: Meta<typeof SearchOverlay> = {
  component: SearchOverlay,
  args: {
    tabs: sampleTabs,
    onSwitch: fn(),
    onClose: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchOverlay>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 全タブが表示される
    expect(canvas.getByText('Gmail - Inbox')).toBeInTheDocument();
    expect(canvas.getByText('GitHub - Pull Requests')).toBeInTheDocument();
    // 検索入力欄がフォーカスされている
    expect(canvas.getByTestId('search-input')).toHaveFocus();
  },
};

export const Searching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('search-input');
    await userEvent.type(input, 'git');
    // GitHubだけが表示される（ハイライトで<mark>タグに分割されるのでtestIdで確認）
    expect(canvas.getByTestId('tab-card-2')).toBeInTheDocument();
    expect(canvas.queryByTestId('tab-card-1')).not.toBeInTheDocument();
  },
};

export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByTestId('search-input');
    await userEvent.type(input, 'zzzzz');
    expect(canvas.getByText('該当なし')).toBeInTheDocument();
  },
};
