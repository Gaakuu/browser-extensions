import type { CropRect } from '../types/messages';

const MAX_FULL_PAGE_HEIGHT = 10000;

export class CaptureService {
  async captureVisibleArea(): Promise<string> {
    return chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
  }

  async cropImage(dataUrl: string, rect: CropRect): Promise<string> {
    const { x, y, width, height, devicePixelRatio: dpr } = rect;

    const bitmap = await this.loadBitmap(dataUrl);
    const sw = Math.round(width * dpr);
    const sh = Math.round(height * dpr);

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      bitmap,
      Math.round(x * dpr),
      Math.round(y * dpr),
      sw,
      sh,
      0,
      0,
      sw,
      sh,
    );
    bitmap.close();

    return this.canvasToDataUrl(canvas);
  }

  async captureFullPage(
    tabId: number,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const [{ result: pageInfo }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      }),
    });

    const totalHeight = Math.min(pageInfo.scrollHeight, MAX_FULL_PAGE_HEIGHT);
    const viewportHeight = pageInfo.viewportHeight;
    const dpr = pageInfo.devicePixelRatio;
    const totalSlices = Math.ceil(totalHeight / viewportHeight);

    const captures: string[] = [];

    for (let i = 0; i < totalSlices; i++) {
      const scrollY = i * viewportHeight;
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (y: number) => window.scrollTo(0, y),
        args: [scrollY],
      });
      // ブラウザの描画を待つ
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
        format: 'png',
      });
      captures.push(dataUrl);

      onProgress?.(((i + 1) / totalSlices) * 100);
    }

    return this.stitchImages(captures, totalHeight, viewportHeight, dpr);
  }

  private async stitchImages(
    captures: string[],
    totalHeight: number,
    viewportHeight: number,
    dpr: number,
  ): Promise<string> {
    const bitmaps = await Promise.all(captures.map((url) => this.loadBitmap(url)));
    const canvasWidth = bitmaps[0].width;
    const canvasHeight = Math.round(totalHeight * dpr);

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < bitmaps.length; i++) {
      const dy = Math.round(i * viewportHeight * dpr);
      const remainingHeight = canvasHeight - dy;
      const drawHeight = Math.min(bitmaps[i].height, remainingHeight);
      ctx.drawImage(bitmaps[i], 0, 0, canvasWidth, drawHeight, 0, dy, canvasWidth, drawHeight);
      bitmaps[i].close();
    }

    return this.canvasToDataUrl(canvas);
  }

  private async loadBitmap(dataUrl: string): Promise<ImageBitmap> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }

  private async canvasToDataUrl(canvas: OffscreenCanvas): Promise<string> {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
