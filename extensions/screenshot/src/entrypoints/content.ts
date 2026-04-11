import { OverlayManager } from '../content/OverlayManager';
import type { BackgroundMessage } from '../types/messages';
import { loadSettings } from '../utils/settings';

async function copyToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
}

/** base64 スライスを Canvas でスティッチ（各画像の実際の高さで配置） */
async function stitchSlices(slices: string[], scrollHeight: number): Promise<string> {
  const images = await Promise.all(
    slices.map(
      (base64) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = `data:image/png;base64,${base64}`;
        }),
    ),
  );

  const canvasWidth = images[0].naturalWidth;
  const totalHeight = images.reduce((sum, img) => sum + img.naturalHeight, 0);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context');

  let dy = 0;
  for (const img of images) {
    ctx.drawImage(img, 0, dy);
    dy += img.naturalHeight;
  }

  return canvas.toDataURL('image/png');
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const overlay = new OverlayManager(
      // onMessage: Content → Background へメッセージ送信
      (message) => {
        chrome.runtime.sendMessage(message, async (response) => {
          if (!response) return;

          if (response.type === 'CAPTURE_RESULT') {
            const settings = await loadSettings();
            let clipboardStatus: 'success' | 'error' | null = null;
            if (settings.autoCopyToClipboard) {
              const copied = await copyToClipboard(response.dataUrl);
              clipboardStatus = copied ? 'success' : 'error';
            }
            overlay.showPreview(response.dataUrl, clipboardStatus);
          } else if (response.type === 'CAPTURE_FULL_PAGE_SLICES') {
            try {
              const dataUrl = await stitchSlices(response.slices, response.scrollHeight);
              const settings = await loadSettings();
              let clipboardStatus: 'success' | 'error' | null = null;
              if (settings.autoCopyToClipboard) {
                const copied = await copyToClipboard(dataUrl);
                clipboardStatus = copied ? 'success' : 'error';
              }
              overlay.showPreview(dataUrl, clipboardStatus);
            } catch {
              overlay.showPreview('', 'error');
            }
          } else if (response.type === 'CAPTURE_ERROR') {
            overlay.showPreview('', 'error');
          }
        });
      },
      // onDismiss: オーバーレイを閉じる
      () => {
        overlay.hide();
        chrome.runtime.sendMessage({ type: 'OVERLAY_CLOSED' });
      },
    );

    // Background → Content メッセージ受信
    chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, _sendResponse) => {
      switch (message.type) {
        case 'START_CAPTURE':
          overlay.show();
          break;

        case 'CAPTURE_PROGRESS':
          break;
      }
    });

    // ページ離脱時にオーバーレイを自動クローズ
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && overlay.isVisible()) {
        overlay.hide();
        chrome.runtime.sendMessage({ type: 'OVERLAY_CLOSED' });
      }
    });
  },
});
