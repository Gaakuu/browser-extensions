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
        title: tab.title ?? '',
        url: tab.url ?? '',
        favIconUrl: tab.favIconUrl ?? '',
        lastAccessed: now,
      });
    }
  }

  getRecentTabs(limit?: number): TabInfo[] {
    const sorted = this.sortByMRU();
    return limit != null ? sorted.slice(0, limit) : sorted;
  }

  getAllTabs(): TabInfo[] {
    return this.sortByMRU();
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

  onTabUpdated(tabId: number, title: string, url: string, favIconUrl: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.title = title;
      tab.url = url;
      tab.favIconUrl = favIconUrl;
    } else {
      // 新規タブの場合は追加
      this.tabs.set(tabId, {
        id: tabId,
        title,
        url,
        favIconUrl,
        lastAccessed: Date.now(),
      });
    }
  }

  private sortByMRU(): TabInfo[] {
    return [...this.tabs.values()].sort((a, b) => b.lastAccessed - a.lastAccessed);
  }
}
