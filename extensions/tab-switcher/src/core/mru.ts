import type { TabInfo } from '../types/tabs';

/** MRU に覚えておくタブ数の上限（閉じ忘れの ID が溜まり続けないように） */
export const MRU_LIMIT = 500;

/** タブがアクティブになった。先頭に移す */
export function recordActivation(order: readonly number[], tabId: number): number[] {
  return [tabId, ...order.filter((id) => id !== tabId)].slice(0, MRU_LIMIT);
}

export function forgetTab(order: readonly number[], tabId: number): number[] {
  return order.filter((id) => id !== tabId);
}

/** prerender などでタブの ID が差し替わった */
export function replaceTab(order: readonly number[], addedId: number, removedId: number): number[] {
  return order.map((id) => (id === removedId ? addedId : id));
}

/**
 * タブを最近使った順に並べる。
 * 1. 表示中のタブ（activeTabId）を先頭に置く
 * 2. 拡張が見たアクティブ化の順（order）
 * 3. まだ見ていないタブは Chrome の lastAccessed の新しい順
 *    （拡張の読み込み直後やブラウザの再起動後。裏で開いただけのタブもここに入る）
 */
export function sortByMru(
  tabs: readonly TabInfo[],
  order: readonly number[],
  activeTabId?: number,
): TabInfo[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  const score = (tab: TabInfo): [number, number] => {
    if (tab.id === activeTabId) return [0, 0];
    const r = rank.get(tab.id);
    if (r != null) return [1, r];
    return [2, -(tab.lastAccessed ?? 0)];
  };
  return [...tabs].sort((a, b) => {
    const [ga, va] = score(a);
    const [gb, vb] = score(b);
    return ga - gb || va - vb || a.index - b.index;
  });
}

const HTTP_ICON = /^(https?|data):/;

export function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id == null || tab.id === chrome.tabs.TAB_ID_NONE) return null;
  const url = tab.url || tab.pendingUrl || '';
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || url,
    url,
    favIconUrl: tab.favIconUrl && HTTP_ICON.test(tab.favIconUrl) ? tab.favIconUrl : faviconFor(url),
    lastAccessed: tab.lastAccessed,
  };
}

/** chrome:// などで favIconUrl が使えないときは、拡張の favicon API から取る */
function faviconFor(pageUrl: string): string {
  if (!pageUrl || typeof chrome === 'undefined' || !chrome.runtime?.getURL) return '';
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}
