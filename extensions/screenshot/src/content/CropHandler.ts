import type { CropRect, Point } from '../types/messages';

export interface CropHandlerOptions {
  onCropUpdate: (rect: { x: number; y: number; width: number; height: number }) => void;
  onCropComplete: (rect: CropRect) => void;
  onCancel: () => void;
}

export class CropHandler {
  private options: CropHandlerOptions;
  private startPoint: Point | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: CropHandlerOptions) {
    this.options = options;
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  start(startPoint: Point): void {
    this.startPoint = startPoint;

    document.addEventListener('mousemove', this.boundMouseMove, true);
    document.addEventListener('mouseup', this.boundMouseUp, true);
    document.addEventListener('keydown', this.boundKeyDown, true);
  }

  stop(): void {
    this.startPoint = null;

    document.removeEventListener('mousemove', this.boundMouseMove, true);
    document.removeEventListener('mouseup', this.boundMouseUp, true);
    document.removeEventListener('keydown', this.boundKeyDown, true);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.startPoint) return;

    const rect = this.calculateRect(this.startPoint, { x: e.clientX, y: e.clientY });
    this.options.onCropUpdate(rect);
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.startPoint) return;

    const rect = this.calculateRect(this.startPoint, { x: e.clientX, y: e.clientY });
    const cropRect: CropRect = {
      ...rect,
      devicePixelRatio: window.devicePixelRatio,
    };

    this.stop();
    this.options.onCropComplete(cropRect);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.stop();
      this.options.onCancel();
    }
  }

  private calculateRect(start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    return { x, y, width, height };
  }
}
