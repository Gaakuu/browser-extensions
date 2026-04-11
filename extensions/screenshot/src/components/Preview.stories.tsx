import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Preview } from './Preview';

// 1x1 赤ピクセルの PNG（テスト用）
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const meta: Meta<typeof Preview> = {
  component: Preview,
  args: {
    imageUrl: SAMPLE_IMAGE,
    clipboardStatus: null,
    onSave: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Preview>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('preview-image')).toBeInTheDocument();
  },
};

export const ClickSave: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTitle('保存'));
    expect(args.onSave).toHaveBeenCalledOnce();
  },
};

export const ClickClose: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTitle('閉じる'));
    expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const ClipboardSuccess: Story = {
  args: {
    clipboardStatus: 'success',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('コピー済み')).toBeInTheDocument();
  },
};

export const ClipboardError: Story = {
  args: {
    clipboardStatus: 'error',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('コピー失敗')).toBeInTheDocument();
  },
};
