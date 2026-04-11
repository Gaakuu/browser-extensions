import { describe, it, expect, vi, beforeEach } from 'vitest';

// CaptureService / DownloadService のモック
const mockCaptureVisibleArea = vi.fn();
const mockCaptureFullPage = vi.fn();
const mockCropImage = vi.fn();
const mockSaveAsFile = vi.fn();

vi.mock('./CaptureService', () => ({
  CaptureService: class {
    captureVisibleArea = mockCaptureVisibleArea;
    captureFullPage = mockCaptureFullPage;
    cropImage = mockCropImage;
  },
}));

vi.mock('./DownloadService', () => ({
  DownloadService: class {
    saveAsFile = mockSaveAsFile;
  },
}));

// Chrome API をグローバルに設定
let commandListener: (command: string) => void;
let messageListener: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void;
const mockTabsSendMessage = vi.fn();
const mockTabsQuery = vi.fn();

(globalThis as any).chrome = {
  commands: {
    onCommand: {
      addListener: (cb: any) => { commandListener = cb; },
    },
  },
  runtime: {
    onMessage: {
      addListener: (cb: any) => { messageListener = cb; },
    },
  },
  tabs: {
    query: (...args: any[]) => mockTabsQuery(...args),
    sendMessage: (...args: any[]) => mockTabsSendMessage(...args),
  },
};

import { initBackground } from './initBackground';
initBackground();

describe('background entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
  });

  describe('chrome.commands.onCommand', () => {
    it('capture-screenshot コマンドでアクティブタブに START_CAPTURE を送信する', async () => {
      await commandListener('capture-screenshot');

      expect(mockTabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'START_CAPTURE' });
    });

    it('不明なコマンドでは何もしない', async () => {
      await commandListener('unknown-command');

      expect(mockTabsSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('chrome.runtime.onMessage', () => {
    it('CAPTURE_VISIBLE_AREA で captureVisibleArea を呼び CAPTURE_RESULT を返す', async () => {
      const fakeDataUrl = 'data:image/png;base64,visible';
      mockCaptureVisibleArea.mockResolvedValue(fakeDataUrl);

      const sendResponse = vi.fn();
      messageListener(
        { type: 'CAPTURE_VISIBLE_AREA' },
        { tab: { id: 1 } },
        sendResponse,
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockCaptureVisibleArea).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'CAPTURE_RESULT',
        dataUrl: fakeDataUrl,
      });
    });

    it('CAPTURE_ELEMENT で cropImage を呼び CAPTURE_RESULT を返す', async () => {
      const rect = { x: 10, y: 20, width: 100, height: 50, devicePixelRatio: 2 };
      const visibleDataUrl = 'data:image/png;base64,visible';
      const croppedDataUrl = 'data:image/png;base64,cropped';

      mockCaptureVisibleArea.mockResolvedValue(visibleDataUrl);
      mockCropImage.mockResolvedValue(croppedDataUrl);

      const sendResponse = vi.fn();
      messageListener(
        { type: 'CAPTURE_ELEMENT', rect },
        { tab: { id: 1 } },
        sendResponse,
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockCropImage).toHaveBeenCalledWith(visibleDataUrl, rect);
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'CAPTURE_RESULT',
        dataUrl: croppedDataUrl,
      });
    });

    it('CAPTURE_FULL_PAGE で captureFullPage を呼び CAPTURE_RESULT を返す', async () => {
      const fakeDataUrl = 'data:image/png;base64,fullpage';
      mockCaptureFullPage.mockResolvedValue(fakeDataUrl);

      const sendResponse = vi.fn();
      messageListener(
        { type: 'CAPTURE_FULL_PAGE' },
        { tab: { id: 1 } },
        sendResponse,
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockCaptureFullPage).toHaveBeenCalledWith(1, expect.any(Function));
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'CAPTURE_RESULT',
        dataUrl: fakeDataUrl,
      });
    });

    it('SAVE_FILE で saveAsFile を呼ぶ', async () => {
      const dataUrl = 'data:image/png;base64,save';
      mockSaveAsFile.mockResolvedValue(undefined);

      const sendResponse = vi.fn();
      messageListener(
        { type: 'SAVE_FILE', dataUrl },
        { tab: { id: 1 } },
        sendResponse,
      );

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockSaveAsFile).toHaveBeenCalledWith(dataUrl);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });
});
