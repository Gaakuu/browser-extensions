import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TabSwitcher, type TabSwitcherHandle } from './TabSwitcher';

const createTabs = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Tab ${i + 1}`,
    url: `https://example.com/${i + 1}`,
    favIconUrl: '',
    lastAccessed: Date.now() - i * 1000,
  }));

const meta: Meta<typeof TabSwitcher> = {
  component: TabSwitcher,
  args: {
    tabs: createTabs(5),
    onSwitch: fn(),
    onClose: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TabSwitcher>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // 5つのタブが表示される
    for (let i = 1; i <= 5; i++) {
      expect(canvas.getByText(`Tab ${i}`)).toBeInTheDocument();
    }
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, args }) => {
    // ↓キーでフォーカスが移動
    await userEvent.keyboard('{ArrowDown}');
    // Enterで確定
    await userEvent.keyboard('{Enter}');
    expect(args.onSwitch).toHaveBeenCalledWith(2); // 2番目のタブ
  },
};

export const EscapeDismiss: Story = {
  play: async ({ args }) => {
    await userEvent.keyboard('{Escape}');
    expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

export const SingleTab: Story = {
  args: {
    tabs: createTabs(1),
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: createTabs(20),
  },
};

export const ExternalHandle: Story = {
  args: {
    onReady: fn(),
  },
  play: async ({ args }) => {
    // onReady が TabSwitcherHandle 付きで呼ばれる
    expect(args.onReady).toHaveBeenCalledOnce();
    const handle = (args.onReady as ReturnType<typeof fn>).mock.calls[0][0] as TabSwitcherHandle;
    expect(handle.moveFocusDown).toBeTypeOf('function');
    expect(handle.moveFocusUp).toBeTypeOf('function');
    expect(handle.confirmSelection).toBeTypeOf('function');
  },
};
