import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElementDetector } from './ElementDetector';

// jsdom には elementFromPoint がないのでスタブを追加
if (!document.elementFromPoint) {
  (document as any).elementFromPoint = () => null;
}

describe('ElementDetector', () => {
  let detector: ElementDetector;
  let onHover: ReturnType<typeof vi.fn>;
  let onElementSelected: ReturnType<typeof vi.fn>;
  let onDragStart: ReturnType<typeof vi.fn>;
  let excludeElement: HTMLDivElement;

  beforeEach(() => {
    onHover = vi.fn();
    onElementSelected = vi.fn();
    onDragStart = vi.fn();
    excludeElement = document.createElement('div');

    // requestAnimationFrame を即時実行に
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });

    detector = new ElementDetector({
      onHover,
      onElementSelected,
      onDragStart,
      excludeElement,
    });
  });

  afterEach(() => {
    detector.stop();
    vi.restoreAllMocks();
  });

  describe('start / stop', () => {
    it('start() 後に mousemove でリスナーが呼ばれる', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);
      el.getBoundingClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(document.elementFromPoint).toHaveBeenCalled();
    });

    it('stop() 後に mousemove でリスナーが呼ばれない', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);

      detector.start();
      detector.stop();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      // start→stop で elementFromPoint は start時に1回も呼ばれないはず
      // (mousemove は stop 後なので)
      expect(onHover).not.toHaveBeenCalled();
    });
  });

  describe('要素検知', () => {
    it('mousemove で検知した要素の DOMRect を onHover に渡す', () => {
      const el = document.createElement('div');
      const mockRect = new DOMRect(10, 20, 200, 100);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);
      el.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).toHaveBeenCalledWith(mockRect);
    });

    it('excludeElement は検知対象から除外される', () => {
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(excludeElement);
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).toHaveBeenCalledWith(null);
    });
  });

  describe('クリック（要素選択）', () => {
    it('click で onElementSelected が DOMRect 付きで発火する', () => {
      const el = document.createElement('div');
      const mockRect = new DOMRect(10, 20, 200, 100);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);
      el.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });

      detector.start();
      // まず mousemove で要素を検知
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));
      // mousedown → mouseup（移動なし）→ click
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 25 }));

      expect(onElementSelected).toHaveBeenCalledWith(mockRect);
    });
  });

  describe('ドラッグ開始', () => {
    it('mousedown + 5px以上の mousemove で onDragStart が発火する', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 100, 100));
      detector.start();
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 50 })); // 10px移動

      expect(onDragStart).toHaveBeenCalledWith({ x: 50, y: 50 });
    });

    it('5px未満の移動ではドラッグ開始とみなさない', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(el);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 100, 100));
      detector.start();
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 53, clientY: 50 })); // 3px移動

      expect(onDragStart).not.toHaveBeenCalled();
    });
  });
});
