import { TabHistoryManager } from '../background/TabHistoryManager';
import type { ContentMessage } from '../types/messages';

export default defineBackground(() => {
  const manager = new TabHistoryManager();
  manager.init();

  // タブイベントの監視
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    manager.onTabActivated(tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    manager.onTabRemoved(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.title && tab.url) {
      manager.onTabUpdated(tabId, tab.title, tab.url, tab.favIconUrl ?? '');
    }
  });

  // コマンドショートカットの処理
  chrome.commands.onCommand.addListener(async (command) => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;

    const sendToContentScript = async (type: 'SHOW_SWITCHER' | 'SHOW_SEARCH') => {
      const tabs = type === 'SHOW_SWITCHER' ? manager.getRecentTabs() : manager.getAllTabs();
      try {
        await chrome.tabs.sendMessage(activeTab.id!, { type, tabs });
      } catch {
        // Content Script が動作しないページ（chrome:// 等）
        // フォールバック: 直前のタブに切り替え
        if (type === 'SHOW_SWITCHER') {
          const recentTabs = manager.getRecentTabs(2);
          const previousTab = recentTabs.find((t) => t.id !== activeTab.id);
          if (previousTab) {
            chrome.tabs.update(previousTab.id, { active: true });
          }
        }
      }
    };

    if (command === 'show-tab-switcher') {
      await sendToContentScript('SHOW_SWITCHER');
    } else if (command === 'search-tabs') {
      await sendToContentScript('SHOW_SEARCH');
    }
  });

  // Content Script からのメッセージ処理
  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    if (message.type === 'SWITCH_TO_TAB') {
      chrome.tabs.update(message.tabId, { active: true });
    } else if (message.type === 'CLOSE_TAB') {
      chrome.tabs.remove(message.tabId);
    } else if (message.type === 'GET_ALL_TABS') {
      sendResponse({ tabs: manager.getAllTabs() });
    }
    return true;
  });
});
