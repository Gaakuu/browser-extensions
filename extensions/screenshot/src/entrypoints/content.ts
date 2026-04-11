import { OverlayManager } from '../content/OverlayManager';
import type { BackgroundMessage } from '../types/messages';

async function copyToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    return true;
  } catch {
    return false;
  }
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
            const copied = await copyToClipboard(response.dataUrl);
            overlay.showPreview(
              response.dataUrl,
              copied ? 'success' : 'error',
            );
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
    chrome.runtime.onMessage.addListener(
      (message: BackgroundMessage, _sender, _sendResponse) => {
        switch (message.type) {
          case 'START_CAPTURE':
            overlay.show();
            break;

          case 'CAPTURE_PROGRESS':
            // プログレス表示（将来実装）
            break;
        }
      },
    );

    // ページ離脱時にオーバーレイを自動クローズ
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && overlay.isVisible()) {
        overlay.hide();
        chrome.runtime.sendMessage({ type: 'OVERLAY_CLOSED' });
      }
    });
  },
});
