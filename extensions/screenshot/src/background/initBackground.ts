import { CaptureService } from './CaptureService';
import { DownloadService } from './DownloadService';
import type { ContentMessage } from '../types/messages';

async function capture(
  getDataUrl: () => Promise<string>,
  sendResponse: (response: any) => void,
) {
  try {
    const dataUrl = await getDataUrl();
    sendResponse({ type: 'CAPTURE_RESULT', dataUrl });
  } catch (error) {
    sendResponse({
      type: 'CAPTURE_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

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
          capture(
            () => captureService.captureVisibleArea(),
            sendResponse,
          );
          return true;
        }

        case 'CAPTURE_FULL_PAGE': {
          capture(
            () => captureService.captureFullPage(
              tabId!,
              (progress) => {
                chrome.tabs.sendMessage(tabId!, {
                  type: 'CAPTURE_PROGRESS',
                  progress,
                });
              },
            ),
            sendResponse,
          );
          return true;
        }

        case 'CAPTURE_ELEMENT':
        case 'CAPTURE_AREA': {
          capture(
            async () => {
              const visibleDataUrl = await captureService.captureVisibleArea();
              return captureService.cropImage(visibleDataUrl, message.rect);
            },
            sendResponse,
          );
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
