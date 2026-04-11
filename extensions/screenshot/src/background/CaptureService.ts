import type { CropRect } from '../types/messages';

const MAX_FULL_PAGE_HEIGHT = 16384;

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

  /**
   * CDP でフルページキャプチャ
   * スクロールせず、clip の y 位置をずらしてチャンクごとにキャプチャ
   * 固定ヘッダーは最初のチャンクにのみ含まれる
   */
  async captureFullPageSlices(tabId: number): Promise<{
    slices: string[];
    scrollHeight: number;
    viewportHeight: number;
  }> {
    const target = { tabId };

    await chrome.debugger.attach(target, '1.3');

    try {
      // ページ情報を取得
      const { result: metricsResult } = await chrome.debugger.sendCommand(
        target,
        'Runtime.evaluate',
        {
          expression: `JSON.stringify({
            scrollWidth: Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth),
            scrollHeight: Math.min(document.documentElement.scrollHeight, ${MAX_FULL_PAGE_HEIGHT}),
            viewportHeight: window.innerHeight
          })`,
          returnByValue: true,
        },
      ) as any;

      const metrics = JSON.parse(metricsResult.value);
      const { scrollWidth, scrollHeight, viewportHeight } = metrics;

      // スクロールをページ先頭に
      await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
        expression: 'window.scrollTo(0, 0)',
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 1枚目: 素のビューポートキャプチャ
      const { data: firstData } = await chrome.debugger.sendCommand(
        target,
        'Page.captureScreenshot',
        { format: 'png' },
      ) as any;

      const slices: string[] = [firstData];

      // 2枚目以降: clip で y をずらしてキャプチャ
      const totalSlices = Math.ceil(scrollHeight / viewportHeight);

      for (let i = 1; i < totalSlices; i++) {
        const y = i * viewportHeight;
        const remaining = scrollHeight - y;
        const clipHeight = Math.min(viewportHeight, remaining);
        if (clipHeight <= 0) break;

        const { data } = await chrome.debugger.sendCommand(
          target,
          'Page.captureScreenshot',
          {
            format: 'png',
            clip: {
              x: 0,
              y,
              width: scrollWidth,
              height: clipHeight,
              scale: 1,
            },
            captureBeyondViewport: true,
          },
        ) as any;

        slices.push(data);
      }

      return { slices, scrollHeight, viewportHeight };
    } finally {
      await chrome.debugger.detach(target);
    }
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
