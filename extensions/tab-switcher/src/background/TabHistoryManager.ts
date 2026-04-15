import type { TabInfo } from '../types/messages';

export class TabHistoryManager {
  private tabs = new Map<number, TabInfo>();

  async init(): Promise<void> {
    const existingTabs = await chrome.tabs.query({});
    const now = Date.now();
    for (const tab of existingTabs) {
      if (tab.id == null) continue;
      this.tabs.set(tab.id, {
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title ?? '',
        url: tab.url ?? '',
        favIconUrl: tab.favIconUrl ?? '',
        lastAccessed: now,
      });
    }
  }

  getRecentTabs(limit?: number, windowId?: number): TabInfo[] {
    const sorted = this.sortByMRU(windowId);
    return limit != null ? sorted.slice(0, limit) : sorted;
  }

  getAllTabs(windowId?: number): TabInfo[] {
    return this.sortByMRU(windowId);
  }

  onTabActivated(tabId: number): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastAccessed = Date.now();
    }
  }

  onTabRemoved(tabId: number): void {
    this.tabs.delete(tabId);
  }

  onTabUpdated(
    tabId: number,
    windowId: number,
    title: string,
    url: string,
    favIconUrl: string,
  ): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.windowId = windowId;
      tab.title = title;
      tab.url = url;
      tab.favIconUrl = favIconUrl;
    } else {
      // 新規タブの場合は追加
      this.tabs.set(tabId, {
        id: tabId,
        windowId,
        title,
        url,
        favIconUrl,
        lastAccessed: Date.now(),
      });
    }
  }

  private sortByMRU(windowId?: number): TabInfo[] {
    const source = [...this.tabs.values()];
    const filtered = windowId != null ? source.filter((t) => t.windowId === windowId) : source;
    return filtered.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }
}
