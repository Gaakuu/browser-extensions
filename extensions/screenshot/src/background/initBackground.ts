import { CaptureService } from './CaptureService';
import { DownloadService } from './DownloadService';
import type { ContentMessage } from '../types/messages';

export function initBackground() {
  const captureService = new CaptureService();
  const downloadService = new DownloadService();

  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'capture-screenshot') return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
  });

  chrome.runtime.onMessage.addListener(
    (message: ContentMessage, sender, sendResponse) => {
      const tabId = sender.tab?.id;

      switch (message.type) {
        case 'CAPTURE_VISIBLE_AREA': {
          (async () => {
            try {
              const dataUrl = await captureService.captureVisibleArea();
              await downloadService.copyToClipboard(dataUrl);
              sendResponse({ type: 'CAPTURE_RESULT', dataUrl });
            } catch (error) {
              sendResponse({
                type: 'CAPTURE_ERROR',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })();
          return true;
        }

        case 'CAPTURE_FULL_PAGE': {
          (async () => {
            try {
              const dataUrl = await captureService.captureFullPage(
                tabId!,
                (progress) => {
                  chrome.tabs.sendMessage(tabId!, {
                    type: 'CAPTURE_PROGRESS',
                    progress,
                  });
                },
              );
              await downloadService.copyToClipboard(dataUrl);
              sendResponse({ type: 'CAPTURE_RESULT', dataUrl });
            } catch (error) {
              sendResponse({
                type: 'CAPTURE_ERROR',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })();
          return true;
        }

        case 'CAPTURE_ELEMENT':
        case 'CAPTURE_AREA': {
          (async () => {
            try {
              const visibleDataUrl = await captureService.captureVisibleArea();
              const croppedDataUrl = await captureService.cropImage(
                visibleDataUrl,
                message.rect,
              );
              await downloadService.copyToClipboard(croppedDataUrl);
              sendResponse({ type: 'CAPTURE_RESULT', dataUrl: croppedDataUrl });
            } catch (error) {
              sendResponse({
                type: 'CAPTURE_ERROR',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })();
          return true;
        }

        case 'SAVE_FILE': {
          (async () => {
            try {
              await downloadService.saveAsFile(message.dataUrl);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })();
          return true;
        }

        case 'OVERLAY_CLOSED':
          break;
      }
    },
  );
}
