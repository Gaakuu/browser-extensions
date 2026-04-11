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

      const el = document.elementFromPoint(e.clientX, e.clientY);

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

  private handleClick(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    if (this.currentElement && !this.isExcluded(this.currentElement)) {
      const rect = this.currentElement.getBoundingClientRect();
      this.options.onElementSelected(rect);
    }
  }

  private isExcluded(el: Element): boolean {
    return (
      el === this.options.excludeElement ||
      this.options.excludeElement.contains(el)
    );
  }
}
