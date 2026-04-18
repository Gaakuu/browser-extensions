import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverlayManager } from './OverlayManager';

vi.mock('../utils/settings', () => ({
  loadSettings: vi.fn().mockResolvedValue({
    autoCopyToClipboard: true,
    filenamePrefix: 'screenshot',
  }),
  saveSettings: vi.fn(),
  DEFAULT_SETTINGS: {
    autoCopyToClipboard: true,
    filenamePrefix: 'screenshot',
  },
}));

describe('OverlayManager', () => {
  let manager: OverlayManager;
  let onMessage: (message: unknown) => void;
  let onDismiss: () => void;

  beforeEach(async () => {
    onMessage = vi.fn();
    onDismiss = vi.fn();
    manager = new OverlayManager(onMessage, onDismiss);
    await manager.show();
  });

  afterEach(() => {
    manager.hide();
    document.body.innerHTML = '';
  });

  describe('プレビュー表示中のページスクロール', () => {
    it('プレビュー表示中の wheel イベントが preventDefault されない', () => {
      manager.showPreview('data:image/png;base64,abc', 'success');

      const wheelEvent = new WheelEvent('wheel', { cancelable: true, bubbles: true });
      document.dispatchEvent(wheelEvent);

      expect(wheelEvent.defaultPrevented).toBe(false);
    });
  });
});
