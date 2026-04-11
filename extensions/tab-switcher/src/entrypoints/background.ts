import { TabHistoryManager } from '../background/TabHistoryManager';
import type { ContentMessage } from '../types/messages';

export default defineBackground(async () => {
  const manager = new TabHistoryManager();
  await manager.init();

  console.log('[Tab Switcher] Background initialized, tabs:', manager.getAllTabs().length);

  // 初回インストール時にオプションページを開く
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }
  });

  // タブイベントの監視
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    manager.onTabActivated(tabId);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id != null) {
      manager.onTabUpdated(tab.id, tab.title ?? '', tab.url ?? '', tab.favIconUrl ?? '');
      manager.onTabActivated(tab.id);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    manager.onTabRemoved(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    if (tab.title || tab.url) {
      manager.onTabUpdated(tabId, tab.title ?? '', tab.url ?? '', tab.favIconUrl ?? '');
    }
  });

  // オーバーレイの表示状態を追跡
  let switcherVisibleTabId: number | null = null;

  // コマンドショートカットの処理
  chrome.commands.onCommand.addListener(async (command) => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;

    if (command === 'show-tab-switcher') {
      if (switcherVisibleTabId === activeTab.id) {
        // 既にオーバーレイ表示中 → Space 連打 = フォーカス移動
        try {
          await chrome.tabs.sendMessage(activeTab.id, { type: 'MOVE_FOCUS_DOWN' });
        } catch {
          // ignore
        }
        return;
      }

      const tabs = manager.getRecentTabs();
      console.log('[Tab Switcher] SHOW_SWITCHER, tabs:', tabs.length);
      try {
        await chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_SWITCHER', tabs });
        switcherVisibleTabId = activeTab.id;
      } catch {
        console.log('[Tab Switcher] Fallback: Content Script not available');
        const recentTabs = manager.getRecentTabs(2);
        const previousTab = recentTabs.find((t) => t.id !== activeTab.id);
        if (previousTab) {
          chrome.tabs.update(previousTab.id, { active: true });
        }
      }
    } else if (command === 'search-tabs') {
      const tabs = manager.getAllTabs();
      console.log('[Tab Switcher] SHOW_SEARCH, tabs:', tabs.length);
      try {
        await chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_SEARCH', tabs });
      } catch {
        console.log('[Tab Switcher] Fallback: Content Script not available');
      }
    }
  });

  // Content Script からのメッセージ処理
  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    if (message.type === 'SWITCH_TO_TAB') {
      chrome.tabs.update(message.tabId, { active: true });
      switcherVisibleTabId = null;
    } else if (message.type === 'CLOSE_TAB') {
      chrome.tabs.remove(message.tabId);
    } else if (message.type === 'OVERLAY_CLOSED') {
      switcherVisibleTabId = null;
    } else if (message.type === 'GET_ALL_TABS') {
      sendResponse({ tabs: manager.getAllTabs() });
    }
    return true;
  });
});
