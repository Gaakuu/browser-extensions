import type { Point } from '../types/messages';

const DRAG_THRESHOLD = 5;

export interface ElementDetectorOptions {
  onHover: (rect: DOMRect | null) => void;
  onElementSelected: (rect: DOMRect) => void;
  onDragStart: (startPoint: Point) => void;
  excludeElement: HTMLElement;
}

export class ElementDetector {
  private options: ElementDetectorOptions;
  private running = false;
  private rafPending = false;
  private currentElement: Element | null = null;
  private mouseDownPoint: Point | null = null;
  private isDragging = false;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;

  constructor(options: ElementDetectorOptions) {
    this.options = options;
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundClick = this.handleClick.bind(this);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.isDragging = false;
    this.mouseDownPoint = null;

    document.addEventListener('mousemove', this.boundMouseMove, true);
    document.addEventListener('mousedown', this.boundMouseDown, true);
    document.addEventListener('mouseup', this.boundMouseUp, true);
    document.addEventListener('click', this.boundClick, true);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.currentElement = null;
    this.mouseDownPoint = null;
    this.isDragging = false;

    document.removeEventListener('mousemove', this.boundMouseMove, true);
    document.removeEventListener('mousedown', this.boundMouseDown, true);
    document.removeEventListener('mouseup', this.boundMouseUp, true);
    document.removeEventListener('click', this.boundClick, true);
  }

  private handleMouseMove(e: MouseEvent): void {
    // ドラッグ中の判定
    if (this.mouseDownPoint && !this.isDragging) {
      const dx = e.clientX - this.mouseDownPoint.x;
      const dy = e.clientY - this.mouseDownPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= DRAG_THRESHOLD) {
        this.isDragging = true;
        this.options.onDragStart(this.mouseDownPoint);
        return;
      }
    }

    if (this.isDragging) return;

    // 要素検知（requestAnimationFrame でスロットリング）
    if (this.rafPending) return;
    this.rafPending = true;

    requestAnimationFrame(() => {
      this.rafPending = false;
      if (!this.running) return;

      const raw = this.getElementBehindOverlay(e.clientX, e.clientY);
      const el = raw ? this.findMeaningfulElement(raw) : null;

      if (!el || this.isExcluded(el)) {
        this.currentElement = null;
        this.options.onHover(null);
        return;
      }

      if (el !== this.currentElement) {
        this.currentElement = el;
      }

      const rect = el.getBoundingClientRect();
      this.options.onHover(rect);
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    this.mouseDownPoint = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.mouseDownPoint = null;
  }

  private handleClick(e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    // オーバーレイ内（ツールバー等）のクリックは無視
    if (this.isClickInsideOverlay(e)) return;

    if (this.currentElement && !this.isExcluded(this.currentElement)) {
      const rect = this.currentElement.getBoundingClientRect();
      this.options.onElementSelected(rect);
    }
  }

  private isClickInsideOverlay(e: MouseEvent): boolean {
    return e.composedPath().some(
      (el) => el instanceof HTMLElement && el.getAttribute('data-testid') === 'toolbar',
    );
  }

  /** オーバーレイの裏にあるページ要素を取得 */
  private getElementBehindOverlay(x: number, y: number): Element | null {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (!this.isExcluded(el)) return el;
    }
    return null;
  }

  private isExcluded(el: Element): boolean {
    return (
      el === this.options.excludeElement ||
      this.options.excludeElement.contains(el)
    );
  }

  private static MIN_SIZE = 40;
  private static MAX_VIEWPORT_RATIO = 0.85;

  /** インライン要素・小さすぎる・大きすぎる要素を親へ遡って意味のあるコンテナを返す */
  private findMeaningfulElement(el: Element): Element | null {
    let current: Element | null = el;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    while (current && current !== document.body && current !== document.documentElement) {
      if (this.isExcluded(current)) return null;

      const style = getComputedStyle(current);
      const rect = current.getBoundingClientRect();

      const isTooSmall =
        rect.width < ElementDetector.MIN_SIZE ||
        rect.height < ElementDetector.MIN_SIZE;
      const isTooLarge =
        rect.width > vw * ElementDetector.MAX_VIEWPORT_RATIO &&
        rect.height > vh * ElementDetector.MAX_VIEWPORT_RATIO;
      const isInline = style.display === 'inline';

      if (isTooSmall || isTooLarge || isInline) {
        current = current.parentElement;
        continue;
      }

      return current;
    }

    return null;
  }
}
