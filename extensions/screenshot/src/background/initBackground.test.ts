import { beforeEach, describe, expect, it, vi } from 'vitest';

// CaptureService / DownloadService のモック
const mockCaptureVisibleArea = vi.fn();
const mockCaptureFullPage = vi.fn();
const mockCropImage = vi.fn();
const mockSaveAsFile = vi.fn();

vi.mock('./CaptureService', () => ({
  CaptureService: class {
    captureVisibleArea = mockCaptureVisibleArea;
    captureFullPageSlices = mockCaptureFullPage;
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
let messageListener: (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | void;
const mockTabsSendMessage = vi.fn();
const mockTabsQuery = vi.fn();

(globalThis as unknown as { chrome: unknown }).chrome = {
  commands: {
    onCommand: {
      addListener: (cb: typeof commandListener) => {
        commandListener = cb;
      },
    },
  },
  runtime: {
    onMessage: {
      addListener: (cb: typeof messageListener) => {
        messageListener = cb;
      },
    },
  },
  tabs: {
    query: (...args: unknown[]) => mockTabsQuery(...args),
    sendMessage: (...args: unknown[]) => mockTabsSendMessage(...args),
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
      messageListener({ type: 'CAPTURE_VISIBLE_AREA' }, { tab: { id: 1 } }, sendResponse);

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
      messageListener({ type: 'CAPTURE_ELEMENT', rect }, { tab: { id: 1 } }, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockCropImage).toHaveBeenCalledWith(visibleDataUrl, rect);
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'CAPTURE_RESULT',
        dataUrl: croppedDataUrl,
      });
    });

    it('CAPTURE_FULL_PAGE で captureFullPageSlices を呼び CAPTURE_FULL_PAGE_SLICES を返す', async () => {
      const mockResult = { slices: ['s1', 's2'], scrollHeight: 1800, viewportHeight: 900 };
      mockCaptureFullPage.mockResolvedValue(mockResult);

      const sendResponse = vi.fn();
      messageListener({ type: 'CAPTURE_FULL_PAGE' }, { tab: { id: 1 } }, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockCaptureFullPage).toHaveBeenCalledWith(1);
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'CAPTURE_FULL_PAGE_SLICES',
        ...mockResult,
      });
    });

    it('SAVE_FILE で saveAsFile を呼ぶ', async () => {
      const dataUrl = 'data:image/png;base64,save';
      mockSaveAsFile.mockResolvedValue(undefined);

      const sendResponse = vi.fn();
      messageListener({ type: 'SAVE_FILE', dataUrl }, { tab: { id: 1 } }, sendResponse);

      await vi.waitFor(() => {
        expect(sendResponse).toHaveBeenCalled();
      });

      expect(mockSaveAsFile).toHaveBeenCalledWith(dataUrl, undefined);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });
});
