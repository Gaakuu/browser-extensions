import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Toolbar } from './Toolbar';

const meta: Meta<typeof Toolbar> = {
  component: Toolbar,
  args: {
    position: 'top',
    onFullPage: fn(),
    onVisibleArea: fn(),
    onSettings: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const Top: Story = {
  args: { position: 'top' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText('全画面')).toBeInTheDocument();
    expect(canvas.getByLabelText('表示領域')).toBeInTheDocument();
    expect(canvas.getByLabelText('設定')).toBeInTheDocument();
  },
};

export const Bottom: Story = {
  args: { position: 'bottom' },
};

export const ClickFullPage: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('全画面'));
    expect(args.onFullPage).toHaveBeenCalledOnce();
  },
};

export const ClickVisibleArea: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('表示領域'));
    expect(args.onVisibleArea).toHaveBeenCalledOnce();
  },
};

export const ClickSettings: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('設定'));
    expect(args.onSettings).toHaveBeenCalledOnce();
  },
};
