import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElementDetector } from './ElementDetector';

// jsdom には elementFromPoint/elementsFromPoint がないのでスタブを追加
if (!document.elementFromPoint) {
  (document as any).elementFromPoint = () => null;
}
if (!document.elementsFromPoint) {
  (document as any).elementsFromPoint = () => [];
}

const mockBlockStyle = { display: 'block', position: 'static' } as CSSStyleDeclaration;

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
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockBlockStyle);

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
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 200, 100));

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(document.elementsFromPoint).toHaveBeenCalled();
    });

    it('stop() 後に mousemove でリスナーが呼ばれない', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);

      detector.start();
      detector.stop();

      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).not.toHaveBeenCalled();
    });
  });

  describe('要素検知', () => {
    it('mousemove で検知した要素の DOMRect を onHover に渡す', () => {
      const el = document.createElement('div');
      const mockRect = new DOMRect(10, 20, 200, 100);
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).toHaveBeenCalledWith(mockRect);
    });

    it('excludeElement は検知対象から除外される', () => {
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([excludeElement]);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).toHaveBeenCalledWith(null);
    });
  });

  describe('クリック（要素選択）', () => {
    it('click で onElementSelected が DOMRect 付きで発火する', () => {
      const el = document.createElement('div');
      const mockRect = new DOMRect(10, 20, 200, 100);
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 25 }));

      expect(onElementSelected).toHaveBeenCalledWith(mockRect);
    });
  });

  describe('ドラッグ開始', () => {
    it('mousedown + 5px以上の mousemove で onDragStart が発火する', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 200, 100));

      detector.start();
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 50 }));

      expect(onDragStart).toHaveBeenCalledWith({ x: 50, y: 50 });
    });

    it('5px未満の移動ではドラッグ開始とみなさない', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 200, 100));

      detector.start();
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 53, clientY: 50 }));

      expect(onDragStart).not.toHaveBeenCalled();
    });
  });
});
