import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDownload = vi.fn();
const mockCreateDocument = vi.fn();
const mockSendMessage = vi.fn();
const mockCloseDocument = vi.fn();

vi.stubGlobal('chrome', {
  downloads: {
    download: mockDownload,
  },
  offscreen: {
    createDocument: mockCreateDocument,
    closeDocument: mockCloseDocument,
    Reason: { CLIPBOARD: 'CLIPBOARD' },
  },
  runtime: {
    sendMessage: mockSendMessage,
  },
});

import { DownloadService } from './DownloadService';

describe('DownloadService', () => {
  let service: DownloadService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T14:30:45'));
    service = new DownloadService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saveAsFile', () => {
    it('正しいファイル名で chrome.downloads.download を呼ぶ', async () => {
      const dataUrl = 'data:image/png;base64,abc123';
      mockDownload.mockImplementation((_opts: unknown, cb: unknown) =>
        (cb as (id: number) => void)?.(1),
      );

      await service.saveAsFile(dataUrl);

      expect(mockDownload).toHaveBeenCalledWith(
        {
          url: dataUrl,
          filename: 'screenshot_2026-04-11_14-30-45.png',
          saveAs: false,
        },
        expect.any(Function),
      );
    });

    it('ファイル名のフォーマットが screenshot_YYYY-MM-DD_HH-MM-SS.png', async () => {
      vi.setSystemTime(new Date('2026-01-05T09:05:03'));
      const dataUrl = 'data:image/png;base64,abc';
      mockDownload.mockImplementation((_opts: unknown, cb: unknown) =>
        (cb as (id: number) => void)?.(1),
      );

      await service.saveAsFile(dataUrl);

      const callArgs = mockDownload.mock.calls[0][0];
      expect(callArgs.filename).toBe('screenshot_2026-01-05_09-05-03.png');
    });
  });

  describe('copyToClipboard', () => {
    it('data URL をクリップボードにコピーする', async () => {
      const dataUrl = 'data:image/png;base64,abc123';
      mockCreateDocument.mockResolvedValue(undefined);
      mockSendMessage.mockResolvedValue({ success: true });
      mockCloseDocument.mockResolvedValue(undefined);

      await service.copyToClipboard(dataUrl);

      expect(mockCreateDocument).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'COPY_TO_CLIPBOARD',
        dataUrl,
      });
    });

    it('コピー失敗時にエラーを投げる', async () => {
      const dataUrl = 'data:image/png;base64,abc123';
      mockCreateDocument.mockResolvedValue(undefined);
      mockSendMessage.mockResolvedValue({ success: false, error: 'Clipboard write failed' });
      mockCloseDocument.mockResolvedValue(undefined);

      await expect(service.copyToClipboard(dataUrl)).rejects.toThrow('Clipboard write failed');
    });
  });
});
