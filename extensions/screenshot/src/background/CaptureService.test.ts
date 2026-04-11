import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CropRect } from '../types/messages';

// Chrome API モック
const mockCaptureVisibleTab = vi.fn();
const mockExecuteScript = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    captureVisibleTab: mockCaptureVisibleTab,
  },
  scripting: {
    executeScript: mockExecuteScript,
  },
});

import { CaptureService } from './CaptureService';

describe('CaptureService', () => {
  let service: CaptureService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CaptureService();
  });

  describe('captureVisibleArea', () => {
    it('chrome.tabs.captureVisibleTab を呼び data URL を返す', async () => {
      const fakeDataUrl = 'data:image/png;base64,abc123';
      mockCaptureVisibleTab.mockResolvedValue(fakeDataUrl);

      const result = await service.captureVisibleArea();

      expect(mockCaptureVisibleTab).toHaveBeenCalledWith(
        undefined,
        { format: 'png' },
      );
      expect(result).toBe(fakeDataUrl);
    });

    it('キャプチャ不可ページでエラーを投げる', async () => {
      mockCaptureVisibleTab.mockRejectedValue(new Error('Cannot capture'));

      await expect(service.captureVisibleArea()).rejects.toThrow('Cannot capture');
    });
  });

  describe('cropImage', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('CropRect に基づき devicePixelRatio を考慮してトリミングする', async () => {
      const sourceDataUrl = 'data:image/png;base64,abc123';
      const rect: CropRect = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        devicePixelRatio: 2,
      };

      const drawImageSpy = vi.fn();
      const mockBitmap = { width: 400, height: 300, close: vi.fn() };
      const mockBlob = new Blob(['fake'], { type: 'image/png' });

      // loadBitmap をモック
      vi.spyOn(service as any, 'loadBitmap').mockResolvedValue(mockBitmap);

      // OffscreenCanvas をモック
      let createdWidth = 0;
      let createdHeight = 0;
      vi.stubGlobal('OffscreenCanvas', class {
        width: number;
        height: number;
        constructor(w: number, h: number) {
          this.width = w;
          this.height = h;
          createdWidth = w;
          createdHeight = h;
        }
        getContext() { return { drawImage: drawImageSpy }; }
        convertToBlob() { return Promise.resolve(mockBlob); }
      });

      // canvasToDataUrl をモック
      vi.spyOn(service as any, 'canvasToDataUrl').mockResolvedValue('data:image/png;base64,cropped');

      const result = await service.cropImage(sourceDataUrl, rect);

      // OffscreenCanvas は width * dpr, height * dpr で作成される
      expect(createdWidth).toBe(200);
      expect(createdHeight).toBe(100);

      // drawImage の sx, sy は x * dpr, y * dpr
      expect(drawImageSpy).toHaveBeenCalledWith(
        mockBitmap,
        20,  // 10 * 2
        40,  // 20 * 2
        200, // 100 * 2
        100, // 50 * 2
        0,
        0,
        200,
        100,
      );

      expect(mockBitmap.close).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,cropped');
    });
  });

  describe('captureFullPage', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('スクロールキャプチャでページ全体を結合する', async () => {
      const fakeDataUrl = 'data:image/png;base64,abc123';
      mockCaptureVisibleTab.mockResolvedValue(fakeDataUrl);

      // 1回目: ページ情報取得、2回目以降: スクロール
      mockExecuteScript
        .mockResolvedValueOnce([{
          result: {
            scrollHeight: 2000,
            viewportHeight: 800,
            devicePixelRatio: 1,
          },
        }])
        .mockResolvedValue([{ result: undefined }]);

      vi.spyOn(service as any, 'stitchImages').mockResolvedValue('data:image/png;base64,stitched');

      const onProgress = vi.fn();
      const result = await service.captureFullPage(1, onProgress);

      expect(result).toBe('data:image/png;base64,stitched');
      expect(onProgress).toHaveBeenCalled();
      // 2000 / 800 = 2.5 → 3回キャプチャ
      expect(mockCaptureVisibleTab).toHaveBeenCalledTimes(3);
    });

    it('上限（10,000px）を超える場合は上限で切る', async () => {
      const fakeDataUrl = 'data:image/png;base64,abc123';
      mockCaptureVisibleTab.mockResolvedValue(fakeDataUrl);

      mockExecuteScript
        .mockResolvedValueOnce([{
          result: {
            scrollHeight: 15000,
            viewportHeight: 800,
            devicePixelRatio: 1,
          },
        }])
        .mockResolvedValue([{ result: undefined }]);

      vi.spyOn(service as any, 'stitchImages').mockResolvedValue('data:image/png;base64,stitched');

      const onProgress = vi.fn();
      await service.captureFullPage(1, onProgress);

      // 10000 / 800 = 12.5 → 13回キャプチャ
      expect(mockCaptureVisibleTab).toHaveBeenCalledTimes(13);
    });
  });
});
