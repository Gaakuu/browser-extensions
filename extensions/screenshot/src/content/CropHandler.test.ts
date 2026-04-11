import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CropHandler } from './CropHandler';
import type { CropRect } from '../types/messages';

describe('CropHandler', () => {
  let handler: CropHandler;
  let onCropUpdate: ReturnType<typeof vi.fn>;
  let onCropComplete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCropUpdate = vi.fn();
    onCropComplete = vi.fn();
    onCancel = vi.fn();

    // devicePixelRatio のモック
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true });

    handler = new CropHandler({
      onCropUpdate,
      onCropComplete,
      onCancel,
    });
  });

  afterEach(() => {
    handler.stop();
  });

  describe('ドラッグ操作', () => {
    it('start 後の mousemove で onCropUpdate が矩形を返す', () => {
      handler.start({ x: 100, y: 100 });

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));

      expect(onCropUpdate).toHaveBeenCalledWith({
        x: 100,
        y: 100,
        width: 100,
        height: 50,
      });
    });

    it('mouseup で onCropComplete が CropRect を返す', () => {
      handler.start({ x: 100, y: 100 });

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 200, clientY: 150 }));

      expect(onCropComplete).toHaveBeenCalledWith(expect.objectContaining({
        x: 100,
        y: 100,
        width: 100,
        height: 50,
        devicePixelRatio: 2,
      }));
    });
  });

  describe('全方向のドラッグ', () => {
    it('左上→右下のドラッグで正しい矩形', () => {
      handler.start({ x: 50, y: 50 });
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 200 }));

      expect(onCropUpdate).toHaveBeenCalledWith({
        x: 50, y: 50, width: 100, height: 150,
      });
    });

    it('右下→左上のドラッグで正しい矩形（正の width/height）', () => {
      handler.start({ x: 150, y: 200 });
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));

      expect(onCropUpdate).toHaveBeenCalledWith({
        x: 50, y: 50, width: 100, height: 150,
      });
    });

    it('右上→左下のドラッグで正しい矩形', () => {
      handler.start({ x: 200, y: 50 });
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 150 }));

      expect(onCropUpdate).toHaveBeenCalledWith({
        x: 100, y: 50, width: 100, height: 100,
      });
    });

    it('左下→右上のドラッグで正しい矩形', () => {
      handler.start({ x: 100, y: 150 });
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 50 }));

      expect(onCropUpdate).toHaveBeenCalledWith({
        x: 100, y: 50, width: 100, height: 100,
      });
    });
  });

  describe('Esc キャンセル', () => {
    it('Esc キーで onCancel が呼ばれる', () => {
      handler.start({ x: 100, y: 100 });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stop 後にイベントリスナーが解除されている', () => {
      handler.start({ x: 100, y: 100 });
      handler.stop();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 200, clientY: 200 }));

      expect(onCropUpdate).not.toHaveBeenCalled();
      expect(onCropComplete).not.toHaveBeenCalled();
    });
  });

  describe('devicePixelRatio', () => {
    it('CropRect に devicePixelRatio が含まれる', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 3 });

      handler.start({ x: 10, y: 20 });
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 110, clientY: 70 }));

      expect(onCropComplete).toHaveBeenCalledWith(expect.objectContaining({
        devicePixelRatio: 3,
      }));
    });
  });
});
