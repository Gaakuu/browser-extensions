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
