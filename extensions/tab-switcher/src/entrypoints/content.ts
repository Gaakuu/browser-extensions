import { KeyboardHandler } from '../content/KeyboardHandler';
import { OverlayManager } from '../content/OverlayManager';
import type { BackgroundMessage } from '../types/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let keyboardHandler: KeyboardHandler | null = null;

    const overlay = new OverlayManager(
      // onSwitch
      (tabId) => {
        chrome.runtime.sendMessage({ type: 'SWITCH_TO_TAB', tabId });
        overlay.hide();
        keyboardHandler?.destroy();
        keyboardHandler = null;
      },
      // onClose
      (tabId) => {
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId });
        overlay.removeTab(tabId);
      },
      // onDismiss
      () => {
        overlay.hide();
        keyboardHandler?.destroy();
        keyboardHandler = null;
      },
    );

    chrome.runtime.onMessage.addListener((message: BackgroundMessage) => {
      if (message.type === 'SHOW_SWITCHER') {
        overlay.show('switcher', message.tabs);

        // キー押し続けモード: 修飾キーを離したら確定
        keyboardHandler = new KeyboardHandler();
        keyboardHandler.onModifierRelease(() => {
          if (overlay.isVisible()) {
            // 現在フォーカスされているタブに切り替え
            // TabSwitcher が Enter イベントを処理するので、Enter をシミュレート
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
          }
        });
      } else if (message.type === 'SHOW_SEARCH') {
        overlay.show('search', message.tabs);
      } else if (message.type === 'TAB_CLOSED') {
        overlay.removeTab(message.tabId);
      }
    });
  },
});
