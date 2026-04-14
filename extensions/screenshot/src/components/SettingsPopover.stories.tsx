import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ScreenshotSettings } from '../types/messages';
import { SettingsPopover } from './SettingsPopover';

const DEFAULT_SETTINGS: ScreenshotSettings = {
  autoCopyToClipboard: true,
  filenamePrefix: 'screenshot',
};

// Popover は anchorEl が必須なので、render 関数で anchor を提供する
function Wrapper(props: {
  initialSettings?: ScreenshotSettings;
  onClose: () => void;
  onChange: (s: Partial<ScreenshotSettings>) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setAnchorEl(anchorRef.current);
  }, []);

  return (
    <div style={{ padding: 80 }}>
      <button ref={anchorRef} type="button" data-testid="anchor">
        anchor
      </button>
      <SettingsPopover
        anchorEl={anchorEl}
        settings={props.initialSettings ?? DEFAULT_SETTINGS}
        onClose={props.onClose}
        onChange={props.onChange}
      />
    </div>
  );
}

const meta: Meta<typeof Wrapper> = {
  component: Wrapper,
  args: {
    onClose: fn(),
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Wrapper>;

// disablePortal が指定されているので Popover は anchor の近くに描画される
// canvasElement の中に含まれる
function findPopoverRoot(canvasElement: HTMLElement): HTMLElement {
  // canvasElement またはその親ツリー内の Popover を探す
  const root = canvasElement.ownerDocument.body;
  return root;
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const root = findPopoverRoot(canvasElement);
    const popover = await within(root).findByText('設定');
    expect(popover).toBeInTheDocument();
  },
};

export const ToggleAutoCopy: Story = {
  play: async ({ canvasElement, args }) => {
    const root = findPopoverRoot(canvasElement);
    await within(root).findByText('設定');
    const switchInput = root.querySelector(
      '.MuiSwitch-input',
    ) as HTMLInputElement | null;
    expect(switchInput).not.toBeNull();
    expect(switchInput?.checked).toBe(true);

    await userEvent.click(switchInput as HTMLInputElement);

    expect(args.onChange).toHaveBeenCalledWith({ autoCopyToClipboard: false });
  },
};

export const EditFilenamePrefix: Story = {
  play: async ({ canvasElement, args }) => {
    const root = findPopoverRoot(canvasElement);
    const input = (await within(root).findByLabelText(
      'ファイル名プレフィックス',
    )) as HTMLInputElement;

    await userEvent.clear(input);
    await userEvent.type(input, 'capture');
    input.blur();

    expect(args.onChange).toHaveBeenCalledWith({ filenamePrefix: 'capture' });
  },
};

export const EmptyPrefixFallsBackToDefault: Story = {
  play: async ({ canvasElement, args }) => {
    const root = findPopoverRoot(canvasElement);
    const input = (await within(root).findByLabelText(
      'ファイル名プレフィックス',
    )) as HTMLInputElement;

    await userEvent.clear(input);
    input.blur();

    expect(args.onChange).toHaveBeenCalledWith({ filenamePrefix: 'screenshot' });
  },
};

export const AutoCopyDisabled: Story = {
  args: {
    initialSettings: { autoCopyToClipboard: false, filenamePrefix: 'screenshot' },
  },
  play: async ({ canvasElement }) => {
    const root = findPopoverRoot(canvasElement);
    await within(root).findByText('設定');
    const switchInput = root.querySelector(
      '.MuiSwitch-input',
    ) as HTMLInputElement | null;
    expect(switchInput).not.toBeNull();
    expect(switchInput?.checked).toBe(false);
  },
};
