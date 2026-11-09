import type { ContentMessage } from '../types/messages';
import { CaptureService } from './CaptureService';
import { DownloadService } from './DownloadService';

async function capture(
  getDataUrl: () => Promise<string>,
  sendResponse: (response: unknown) => void,
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

const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';

/** 撮れないページ（chrome:// ・新しいタブ・ウェブストア）で押されたことを、アイコンのバッジで一瞬知らせる */
async function flashUnavailable() {
  await chrome.action.setBadgeBackgroundColor({ color: '#c62828' });
  await chrome.action.setBadgeText({ text: '!' });
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: '' });
  }, 1500);
}

/**
 * 撮影の画面を出す。拡張を入れる前から開いていたタブには Content Script が入っていないので、
 * 送れなければ差し込んでから送り直す。差し込めないページではバッジで知らせる。
 */
export async function startCapture(tabId: number) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURE' });
    return;
  } catch {
    // Content Script が無い。下で差し込む
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
    await chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURE' });
  } catch {
    await flashUnavailable();
  }
}

export function initBackground() {
  const captureService = new CaptureService();
  const downloadService = new DownloadService();

  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'capture-screenshot') return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await startCapture(tab.id);
  });

  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) void startCapture(tab.id);
  });

  chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'CAPTURE_VISIBLE_AREA': {
        capture(() => captureService.captureVisibleArea(), sendResponse);
        return true;
      }

      case 'CAPTURE_FULL_PAGE': {
        (async () => {
          try {
            if (!tabId) throw new Error('No tab ID');
            const result = await captureService.captureFullPageSlices(tabId);
            sendResponse({ type: 'CAPTURE_FULL_PAGE_SLICES', ...result });
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
        capture(async () => {
          const visibleDataUrl = await captureService.captureVisibleArea();
          return captureService.cropImage(visibleDataUrl, message.rect);
        }, sendResponse);
        return true;
      }

      case 'SAVE_FILE': {
        (async () => {
          try {
            await downloadService.saveAsFile(message.dataUrl, message.filenamePrefix);
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

      case 'OPEN_SHORTCUTS':
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        break;

      case 'OVERLAY_CLOSED':
        break;
    }
  });
}
