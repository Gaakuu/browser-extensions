import { OverlayManager } from '../content/OverlayManager';
import type { BackgroundMessage } from '../types/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const overlay = new OverlayManager(
      // onMessage: Content → Background へメッセージ送信
      (message) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (!response) return;

          if (response.type === 'CAPTURE_RESULT') {
            overlay.showPreview(response.dataUrl, 'success');
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
