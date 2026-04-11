import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CropRect } from '../types/messages';

// Chrome API モック
const mockCaptureVisibleTab = vi.fn();
const mockExecuteScript = vi.fn();
const mockSendMessage = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    captureVisibleTab: mockCaptureVisibleTab,
    sendMessage: mockSendMessage,
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
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      originalCreateElement = document.createElement.bind(document);
    });

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
      const toDataURLSpy = vi.fn().mockReturnValue('data:image/png;base64,cropped');

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: drawImageSpy,
        }),
        toDataURL: toDataURLSpy,
      };

      // loadImage をモック（Image の onload を回避）
      const mockImg = { width: 400, height: 300 };
      vi.spyOn(service as any, 'loadImage').mockResolvedValue(mockImg);

      // createElement のモック（再帰回避）
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
        return originalCreateElement(tag);
      });

      const result = await service.cropImage(sourceDataUrl, rect);

      // Canvas サイズは width * dpr, height * dpr
      expect(mockCanvas.width).toBe(200); // 100 * 2
      expect(mockCanvas.height).toBe(100); // 50 * 2

      // drawImage の sx, sy は x * dpr, y * dpr
      expect(drawImageSpy).toHaveBeenCalledWith(
        mockImg,
        20,  // 10 * 2
        40,  // 20 * 2
        200, // 100 * 2
        100, // 50 * 2
        0,
        0,
        200,
        100,
      );

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
      mockSendMessage.mockResolvedValue(undefined);

      mockExecuteScript.mockResolvedValue([{
        result: {
          scrollHeight: 2000,
          viewportHeight: 800,
          devicePixelRatio: 1,
        },
      }]);

      // stitchImages をモック（Canvas + Image の読み込みを回避）
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
      mockSendMessage.mockResolvedValue(undefined);

      mockExecuteScript.mockResolvedValue([{
        result: {
          scrollHeight: 15000,
          viewportHeight: 800,
          devicePixelRatio: 1,
        },
      }]);

      vi.spyOn(service as any, 'stitchImages').mockResolvedValue('data:image/png;base64,stitched');

      const onProgress = vi.fn();
      await service.captureFullPage(1, onProgress);

      // 10000 / 800 = 12.5 → 13回キャプチャ
      expect(mockCaptureVisibleTab).toHaveBeenCalledTimes(13);
    });
  });
});
