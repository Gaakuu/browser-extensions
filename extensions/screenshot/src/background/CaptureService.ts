import type { CropRect } from '../types/messages';

const MAX_FULL_PAGE_HEIGHT = 10000;

export class CaptureService {
  async captureVisibleArea(): Promise<string> {
    return chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
  }

  async cropImage(dataUrl: string, rect: CropRect): Promise<string> {
    const { x, y, width, height, devicePixelRatio: dpr } = rect;

    const img = await this.loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    const sw = Math.round(width * dpr);
    const sh = Math.round(height * dpr);
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      img,
      Math.round(x * dpr),
      Math.round(y * dpr),
      sw,
      sh,
      0,
      0,
      sw,
      sh,
    );

    return canvas.toDataURL('image/png');
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
      await chrome.tabs.sendMessage(tabId, {
        type: 'SCROLL_TO',
        scrollY,
      });
      // ブラウザの描画を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

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
    const images = await Promise.all(captures.map((url) => this.loadImage(url)));
    const canvasWidth = images[0].width;
    const canvasHeight = Math.round(totalHeight * dpr);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < images.length; i++) {
      const dy = Math.round(i * viewportHeight * dpr);
      const remainingHeight = canvasHeight - dy;
      const drawHeight = Math.min(images[i].height, remainingHeight);
      ctx.drawImage(images[i], 0, 0, canvasWidth, drawHeight, 0, dy, canvasWidth, drawHeight);
    }

    return canvas.toDataURL('image/png');
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
}
