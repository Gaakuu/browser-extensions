import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CropRect } from '../types/messages';

// Chrome API モック
const mockCaptureVisibleTab = vi.fn();
const mockDebuggerAttach = vi.fn();
const mockDebuggerDetach = vi.fn();
const mockDebuggerSendCommand = vi.fn();

vi.stubGlobal('chrome', {
  tabs: {
    captureVisibleTab: mockCaptureVisibleTab,
  },
  debugger: {
    attach: mockDebuggerAttach,
    detach: mockDebuggerDetach,
    sendCommand: mockDebuggerSendCommand,
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

      vi.spyOn(service as any, 'loadBitmap').mockResolvedValue(mockBitmap);

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

      vi.spyOn(service as any, 'canvasToDataUrl').mockResolvedValue('data:image/png;base64,cropped');

      const result = await service.cropImage(sourceDataUrl, rect);

      expect(createdWidth).toBe(200);
      expect(createdHeight).toBe(100);

      expect(drawImageSpy).toHaveBeenCalledWith(
        mockBitmap,
        20, 40, 200, 100,
        0, 0, 200, 100,
      );

      expect(mockBitmap.close).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,cropped');
    });
  });

  describe('captureFullPageSlices (CDP)', () => {
    it('chrome.debugger でスライスキャプチャを実行する', async () => {
      mockDebuggerAttach.mockResolvedValue(undefined);
      mockDebuggerDetach.mockResolvedValue(undefined);

      mockDebuggerSendCommand
        // Runtime.evaluate → ページ情報取得
        .mockResolvedValueOnce({
          result: {
            value: JSON.stringify({
              scrollWidth: 1440,
              scrollHeight: 1800,
              viewportHeight: 900,
            }),
          },
        })
        // Runtime.evaluate → scrollTo(0, 0)
        .mockResolvedValueOnce({})
        // Page.captureScreenshot（1枚目: ビューポート）
        .mockResolvedValueOnce({ data: 'slice1' })
        // Page.captureScreenshot（2枚目: clip）
        .mockResolvedValueOnce({ data: 'slice2' });

      const result = await service.captureFullPageSlices(1);

      expect(mockDebuggerAttach).toHaveBeenCalledWith({ tabId: 1 }, '1.3');
      expect(result.slices).toHaveLength(2);
      expect(result.slices[0]).toBe('slice1');
      expect(result.slices[1]).toBe('slice2');
      expect(result.scrollHeight).toBe(1800);
      expect(result.viewportHeight).toBe(900);
      expect(mockDebuggerDetach).toHaveBeenCalledWith({ tabId: 1 });
    });

    it('エラー時もデバッガをデタッチする', async () => {
      mockDebuggerAttach.mockResolvedValue(undefined);
      mockDebuggerDetach.mockResolvedValue(undefined);
      mockDebuggerSendCommand.mockRejectedValue(new Error('CDP error'));

      await expect(service.captureFullPageSlices(1)).rejects.toThrow('CDP error');
      expect(mockDebuggerDetach).toHaveBeenCalledWith({ tabId: 1 });
    });
  });
});
