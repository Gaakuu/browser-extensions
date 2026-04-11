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
const mockInlineStyle = { display: 'inline', position: 'static' } as CSSStyleDeclaration;

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
    it('start() 後に mousemove で elementsFromPoint が呼ばれる', () => {
      const el = document.createElement('div');
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 200, 100));

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(document.elementsFromPoint).toHaveBeenCalled();
    });

    it('stop() 後に mousemove でリスナーが呼ばれない', () => {
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([]);

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

    it('excludeElement の後ろにある要素を検知する', () => {
      const pageEl = document.createElement('div');
      const mockRect = new DOMRect(0, 0, 300, 200);
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([excludeElement, pageEl]);
      pageEl.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));

      expect(onHover).toHaveBeenCalledWith(mockRect);
    });
  });

  describe('findMeaningfulElement（要素フィルタリング）', () => {
    it('インライン要素は親に遡る', () => {
      const span = document.createElement('span');
      const div = document.createElement('div');
      div.appendChild(span);
      document.body.appendChild(div);

      const divRect = new DOMRect(0, 0, 300, 100);
      div.getBoundingClientRect = vi.fn().mockReturnValue(divRect);
      span.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 50, 20));

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([span]);
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        if (el === span) return mockInlineStyle;
        return mockBlockStyle;
      });

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 25, clientY: 10 }));

      expect(onHover).toHaveBeenCalledWith(divRect);

      document.body.removeChild(div);
    });

    it('小さすぎる要素（40px未満）は親に遡る', () => {
      const small = document.createElement('div');
      const parent = document.createElement('div');
      parent.appendChild(small);
      document.body.appendChild(parent);

      const parentRect = new DOMRect(0, 0, 200, 100);
      parent.getBoundingClientRect = vi.fn().mockReturnValue(parentRect);
      small.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 30, 30));

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([small]);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 15, clientY: 15 }));

      expect(onHover).toHaveBeenCalledWith(parentRect);

      document.body.removeChild(parent);
    });

    it('大きすぎる要素（ビューポートの85%超）は除外される', () => {
      const big = document.createElement('div');
      document.body.appendChild(big);

      // ビューポートサイズは jsdom デフォルト 1024x768
      big.getBoundingClientRect = vi.fn().mockReturnValue(new DOMRect(0, 0, 1000, 700));

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([big]);

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 350 }));

      expect(onHover).toHaveBeenCalledWith(null);

      document.body.removeChild(big);
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

    it('ツールバー内のクリックでは onElementSelected が発火しない', () => {
      const el = document.createElement('div');
      const mockRect = new DOMRect(10, 20, 200, 100);
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([el]);
      el.getBoundingClientRect = vi.fn().mockReturnValue(mockRect);

      // ツールバー要素を作成
      const toolbar = document.createElement('div');
      toolbar.setAttribute('data-testid', 'toolbar');

      detector.start();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 25 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 25 }));

      // composedPath にツールバーを含むクリックイベントを作成
      const clickEvent = new MouseEvent('click', { clientX: 50, clientY: 25 });
      vi.spyOn(clickEvent, 'composedPath').mockReturnValue([toolbar, excludeElement, document.body]);
      document.dispatchEvent(clickEvent);

      expect(onElementSelected).not.toHaveBeenCalled();
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
