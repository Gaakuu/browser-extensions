import type { ContentMessage } from '../types/messages';
import type { TabHistoryManager } from './TabHistoryManager';

export function registerBackground(manager: TabHistoryManager): void {
  let switcherVisibleTabId: number | null = null;

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    manager.onTabActivated(tabId);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id != null) {
      manager.onTabUpdated(
        tab.id,
        tab.windowId,
        tab.title ?? '',
        tab.url ?? '',
        tab.favIconUrl ?? '',
      );
      manager.onTabActivated(tab.id);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    manager.onTabRemoved(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    if (tab.title || tab.url) {
      manager.onTabUpdated(
        tabId,
        tab.windowId,
        tab.title ?? '',
        tab.url ?? '',
        tab.favIconUrl ?? '',
      );
    }
  });

  chrome.commands.onCommand.addListener(async (command) => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;
    const activeWindowId = activeTab.windowId;

    if (command === 'show-tab-switcher') {
      if (switcherVisibleTabId === activeTab.id) {
        try {
          await chrome.tabs.sendMessage(activeTab.id, { type: 'MOVE_FOCUS_DOWN' });
        } catch {
          // ignore
        }
        return;
      }

      const tabs = manager.getRecentTabs(undefined, activeWindowId);
      console.log('[Tab Switcher] SHOW_SWITCHER, tabs:', tabs.length);
      try {
        await chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_SWITCHER', tabs });
        switcherVisibleTabId = activeTab.id;
      } catch {
        console.log('[Tab Switcher] Fallback: Content Script not available');
        const recentTabs = manager.getRecentTabs(2, activeWindowId);
        const previousTab = recentTabs.find((t) => t.id !== activeTab.id);
        if (previousTab) {
          chrome.tabs.update(previousTab.id, { active: true });
        }
      }
    } else if (command === 'search-tabs') {
      const tabs = manager.getAllTabs(activeWindowId);
      console.log('[Tab Switcher] SHOW_SEARCH, tabs:', tabs.length);
      try {
        await chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_SEARCH', tabs });
      } catch {
        console.log('[Tab Switcher] Fallback: Content Script not available');
      }
    }
  });

  chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
    if (message.type === 'SWITCH_TO_TAB') {
      chrome.tabs.update(message.tabId, { active: true });
      switcherVisibleTabId = null;
    } else if (message.type === 'CLOSE_TAB') {
      chrome.tabs.remove(message.tabId);
    } else if (message.type === 'OVERLAY_CLOSED') {
      switcherVisibleTabId = null;
    } else if (message.type === 'GET_ALL_TABS') {
      sendResponse({ tabs: manager.getAllTabs(sender.tab?.windowId) });
    }
    return true;
  });
}
