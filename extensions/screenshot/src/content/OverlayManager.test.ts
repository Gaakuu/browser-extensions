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

  describe('カーソル', () => {
    const host = () => document.getElementById('screenshot-overlay') as HTMLElement;

    it('撮影モードに入った瞬間から十字になる（ドラッグを始める前から）', () => {
      expect(host().style.cursor).toBe('crosshair');
    });

    it('プレビューに移ったら、または閉じたら元に戻す', async () => {
      manager.showPreview('data:image/png;base64,abc', 'success');
      expect(host().style.cursor).toBe('');

      await manager.show();
      expect(host().style.cursor).toBe('crosshair');
      manager.hide();
      expect(host().style.cursor).toBe('');
    });
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
