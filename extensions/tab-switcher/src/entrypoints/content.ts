import { KeyboardHandler } from '../content/KeyboardHandler';
import { OverlayManager } from '../content/OverlayManager';
import type { BackgroundMessage } from '../types/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let keyboardHandler: KeyboardHandler | null = null;

    const closeOverlay = () => {
      overlay.hide();
      keyboardHandler?.destroy();
      keyboardHandler = null;
      chrome.runtime.sendMessage({ type: 'OVERLAY_CLOSED' });
    };

    const overlay = new OverlayManager(
      // onSwitch
      (tabId) => {
        chrome.runtime.sendMessage({ type: 'SWITCH_TO_TAB', tabId });
        closeOverlay();
      },
      // onClose
      (tabId) => {
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId });
        overlay.removeTab(tabId);
      },
      // onDismiss
      () => {
        closeOverlay();
      },
    );

    chrome.runtime.onMessage.addListener((message: BackgroundMessage) => {
      if (message.type === 'SHOW_SWITCHER') {
        overlay.show('switcher', message.tabs);

        // キー押し続けモード: 修飾キーを離したら確定
        keyboardHandler = new KeyboardHandler(true);
        keyboardHandler.onModifierRelease(() => {
          if (overlay.isVisible()) {
            overlay.confirmSelection();
          }
        });
      } else if (message.type === 'SHOW_SEARCH') {
        // 検索モードは開きっぱなし（修飾キーリリースで閉じない）
        overlay.show('search', message.tabs);
      } else if (message.type === 'TAB_CLOSED') {
        overlay.removeTab(message.tabId);
      } else if (message.type === 'MOVE_FOCUS_DOWN') {
        overlay.moveFocusDown();
      }
    });
  },
});
