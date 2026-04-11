import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CaptureOverlay } from './CaptureOverlay';

const meta: Meta<typeof CaptureOverlay> = {
  component: CaptureOverlay,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CaptureOverlay>;

export const DarkOverlayOnly: Story = {
  args: {
    mode: 'element',
    highlightRect: null,
    cropRect: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('capture-overlay')).toBeInTheDocument();
  },
};

export const ElementHighlight: Story = {
  args: {
    mode: 'element',
    highlightRect: new DOMRect(100, 80, 300, 150),
    cropRect: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('highlight-area')).toBeInTheDocument();
  },
};

export const CropSelection: Story = {
  args: {
    mode: 'crop',
    highlightRect: null,
    cropRect: { x: 50, y: 50, width: 400, height: 250 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('crop-area')).toBeInTheDocument();
    expect(canvas.getByText('400 × 250')).toBeInTheDocument();
  },
};

export const SmallCropSelection: Story = {
  args: {
    mode: 'crop',
    highlightRect: null,
    cropRect: { x: 200, y: 200, width: 80, height: 60 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('80 × 60')).toBeInTheDocument();
  },
};
