import { clearPendingMode, MruStore, setPendingMode } from '../core/MruStore';
import { getWindowTabsByMru } from '../core/windowTabs';

async function switchToPreviousTab(): Promise<void> {
  const [previous] = (await getWindowTabsByMru()).slice(1);
  if (previous) {
    await chrome.tabs.update(previous.id, { active: true });
  }
}

async function openSearch(): Promise<void> {
  await setPendingMode('search');
  try {
    await chrome.action.openPopup();
  } catch (error) {
    // ウィンドウにフォーカスが無いときなどは開けない。次に開いたときに拾わないよう消す
    await clearPendingMode();
    console.warn('[Tab Switcher] openPopup failed', error);
  }
}

export function registerBackground(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage();
    }
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void MruStore.activated(tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void MruStore.removed(tabId);
  });

  chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    void MruStore.replaced(addedTabId, removedTabId);
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command === 'previous-tab') {
      void switchToPreviousTab();
    } else if (command === 'search-tabs') {
      void openSearch();
    }
  });
}
