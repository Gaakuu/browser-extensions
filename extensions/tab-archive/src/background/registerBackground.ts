import { loadArchive } from '../core/ArchiveStore';
import { escapeOmniboxText, searchArchive } from '../core/searchArchive';
import type { BackgroundMessage } from '../types';
import { archiveIdleTabs } from './archiveIdleTabs';
import { fillAlwaysPinnedTabs } from './fillAlwaysPinnedTabs';
import {
  enqueue,
  handleMoved,
  handlePinned,
  handleRemoved,
  handleUnpinned,
  resetActivePinnedTab,
} from './pinnedTabSync';

export const ALARM_NAME = 'tab-archive-sweep';
/** 何分ごとに見回るか */
export const SWEEP_PERIOD_MINUTES = 10;
const OMNIBOX_SUGGESTIONS = 8;
export const COMMAND_RESET_PINNED_TAB = 'reset-pinned-tab';

function ensureAlarm(): void {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: SWEEP_PERIOD_MINUTES });
}

export function registerBackground(): void {
  chrome.runtime.onInstalled.addListener(ensureAlarm);
  chrome.runtime.onStartup.addListener(ensureAlarm);

  // 新しいウィンドウにも、設定した固定タブを出す
  chrome.windows.onCreated.addListener((win) => {
    void enqueue(async () => void (await fillAlwaysPinnedTabs(win)));
  });

  // 固定タブをウィンドウ間でそろえる（設定でオフにできる）
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.pinned === true) void enqueue(() => handlePinned(tab));
    if (changeInfo.pinned === false) void enqueue(() => handleUnpinned(tab));
  });
  chrome.tabs.onMoved.addListener((tabId) => {
    void enqueue(() => handleMoved(tabId));
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    void enqueue(() => handleRemoved(tabId));
  });

  // 固定タブを登録したときの URL に戻す（既定 ⌥⇧R）
  chrome.commands.onCommand.addListener((command) => {
    if (command === COMMAND_RESET_PINNED_TAB)
      void enqueue(async () => void (await resetActivePinnedTab()));
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void archiveIdleTabs();
  });

  chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    if (message?.type === 'ARCHIVE_NOW') {
      archiveIdleTabs().then((count) => sendResponse({ count }));
      return true;
    }
    return undefined;
  });

  // アドレスバーで「ar」+ スペースのあとに打つと、アーカイブから探せる
  chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const matches = searchArchive(await loadArchive(), text).slice(0, OMNIBOX_SUGGESTIONS);
    suggest(
      matches.map((entry) => ({
        content: entry.url,
        description: `${escapeOmniboxText(entry.title)} <url>${escapeOmniboxText(entry.url)}</url>`,
      })),
    );
  });

  chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
    // 候補を選んだときは URL、そのまま Enter したときは一番上の候補を開く
    const url = /^(https?|file):\/\//i.test(text)
      ? text
      : searchArchive(await loadArchive(), text)[0]?.url;
    if (!url) return;
    if (disposition === 'currentTab') {
      await chrome.tabs.update({ url });
    } else {
      await chrome.tabs.create({ url, active: disposition === 'newForegroundTab' });
    }
  });
}
