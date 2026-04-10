import type { TabInfo } from '../types/messages';

export class TabHistoryManager {
  async init(): Promise<void> {
    throw new Error('Not implemented');
  }

  getRecentTabs(_limit?: number): TabInfo[] {
    throw new Error('Not implemented');
  }

  getAllTabs(): TabInfo[] {
    throw new Error('Not implemented');
  }

  onTabActivated(_tabId: number): void {
    throw new Error('Not implemented');
  }

  onTabRemoved(_tabId: number): void {
    throw new Error('Not implemented');
  }

  onTabUpdated(_tabId: number, _title: string, _url: string, _favIconUrl: string): void {
    throw new Error('Not implemented');
  }
}
