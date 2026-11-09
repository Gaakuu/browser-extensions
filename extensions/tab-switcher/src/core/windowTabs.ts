import type { TabInfo } from '../types/tabs';
import { loadOrder } from './MruStore';
import { sortByMru, toTabInfo } from './mru';

/** 今のウィンドウのタブを最近使った順に返す（先頭は表示中のタブ） */
export async function getWindowTabsByMru(windowId?: number): Promise<TabInfo[]> {
  const query: Parameters<typeof chrome.tabs.query>[0] =
    windowId != null ? { windowId } : { currentWindow: true };
  const [tabs, order] = await Promise.all([chrome.tabs.query(query), loadOrder()]);
  const active = tabs.find((t) => t.active);
  const infos = tabs.map(toTabInfo).filter((t): t is TabInfo => t != null);
  return sortByMru(infos, order, active?.id);
}

/**
 * ほかのウィンドウのタブを最近使った順に返す（文字を打ったときの検索用）。
 * 固定タブは除く（固定タブはウィンドウごとに同じものがあるので、今のウィンドウのものを使う）。
 */
export async function getOtherWindowTabsByMru(currentWindowId: number): Promise<TabInfo[]> {
  const [tabs, order] = await Promise.all([
    chrome.tabs.query({ windowType: 'normal' }),
    loadOrder(),
  ]);
  const infos = tabs
    .filter((t) => t.windowId !== currentWindowId && !t.pinned)
    .map(toTabInfo)
    .filter((t): t is TabInfo => t != null);
  return sortByMru(infos, order);
}

/** タブに切り替える。ほかのウィンドウのタブなら、今のウィンドウの右端に持ってくる */
export async function switchToTab(tabId: number, currentWindowId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId !== currentWindowId) {
    await chrome.tabs.move(tabId, { windowId: currentWindowId, index: -1 });
  }
  await chrome.tabs.update(tabId, { active: true });
}
