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

import { initBackground } from './initBackground';

type CommandListener = (command: string) => void | Promise<void>;
type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined;

const mockTabsSendMessage = vi.fn();
const mockTabsQuery = vi.fn();
const mockExecuteScript = vi.fn();
const mockSetBadgeText = vi.fn();
let actionClickListener: (tab: { id?: number }) => void;

let commandListener: CommandListener;
let messageListener: MessageListener;

function setupChromeStubs() {
  commandListener = (() => {}) as CommandListener;
  messageListener = (() => {}) as MessageListener;

  vi.stubGlobal('chrome', {
    commands: {
      onCommand: {
        addListener: (cb: CommandListener) => {
          commandListener = cb;
        },
      },
    },
    runtime: {
      onMessage: {
        addListener: (cb: MessageListener) => {
          messageListener = cb;
        },
      },
    },
    tabs: {
      query: (...args: unknown[]) => mockTabsQuery(...args),
      sendMessage: (...args: unknown[]) => mockTabsSendMessage(...args),
    },
    scripting: {
      executeScript: (...args: unknown[]) => mockExecuteScript(...args),
    },
    action: {
      onClicked: {
        addListener: (cb: (tab: { id?: number }) => void) => {
          actionClickListener = cb;
        },
      },
      setBadgeText: (...args: unknown[]) => mockSetBadgeText(...args),
      setBadgeBackgroundColor: vi.fn(),
    },
  });
}

describe('background entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabsSendMessage.mockReset().mockResolvedValue(undefined);
    mockExecuteScript.mockReset();
    setupChromeStubs();
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    initBackground();
  });

  describe('chrome.commands.onCommand', () => {
    it('capture-screenshot コマンドでアクティブタブに START_CAPTURE を送信する', async () => {
      await commandListener('capture-screenshot');

      expect(mockTabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'START_CAPTURE' });
    });

    it('Content Script の無いタブには差し込んでから送り直す', async () => {
      mockTabsSendMessage
        .mockRejectedValueOnce(new Error('Receiving end does not exist'))
        .mockResolvedValueOnce(undefined);
      mockExecuteScript.mockResolvedValue([]);

      await commandListener('capture-screenshot');

      expect(mockExecuteScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content-scripts/content.js'],
      });
      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2);
      expect(mockSetBadgeText).not.toHaveBeenCalled();
    });

    it('差し込めないページ（chrome:// など）ではエラーにせずバッジで知らせる', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('Receiving end does not exist'));
      mockExecuteScript.mockRejectedValue(new Error('Cannot access a chrome:// URL'));

      await expect(commandListener('capture-screenshot')).resolves.toBeUndefined();

      expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '!' });
    });

    it('ツールバーのアイコンを押しても撮影を始める', async () => {
      actionClickListener({ id: 5 });

      await vi.waitFor(() => {
        expect(mockTabsSendMessage).toHaveBeenCalledWith(5, { type: 'START_CAPTURE' });
      });
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
