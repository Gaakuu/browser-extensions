import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TabCard } from './TabCard';

const sampleTab = {
  id: 1,
  title: 'Gmail - Inbox',
  url: 'https://mail.google.com/mail/u/0/#inbox',
  favIconUrl: 'https://mail.google.com/favicon.ico',
  lastAccessed: Date.now(),
};

const meta: Meta<typeof TabCard> = {
  component: TabCard,
  args: {
    tab: sampleTab,
    isFocused: false,
    onSelect: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TabCard>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('Gmail - Inbox')).toBeInTheDocument();
    expect(canvas.getByText('https://mail.google.com/mail/u/0/#inbox')).toBeInTheDocument();
  },
};

export const Focused: Story = {
  args: {
    isFocused: true,
  },
};

export const WithHighlight: Story = {
  args: {
    highlights: [{ start: 0, end: 2 }, { start: 4, end: 5 }],
    highlightField: 'title',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const marks = canvasElement.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
  },
};

export const CloseButton: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByTestId('close-tab-1');
    await userEvent.click(closeButton);
    expect(args.onClose).toHaveBeenCalledOnce();
  },
};
