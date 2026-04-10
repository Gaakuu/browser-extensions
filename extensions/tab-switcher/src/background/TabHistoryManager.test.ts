import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabHistoryManager } from './TabHistoryManager';

// chrome.tabs API のモック
const mockTabs = [
  {
    id: 1,
    title: 'Gmail',
    url: 'https://mail.google.com',
    favIconUrl: 'https://mail.google.com/favicon.ico',
  },
  {
    id: 2,
    title: 'GitHub',
    url: 'https://github.com',
    favIconUrl: 'https://github.com/favicon.ico',
  },
  { id: 3, title: 'Slack', url: 'https://slack.com', favIconUrl: 'https://slack.com/favicon.ico' },
];

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn().mockResolvedValue(mockTabs),
    onActivated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
  },
});

describe('TabHistoryManager', () => {
  let manager: TabHistoryManager;
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new TabHistoryManager();
    await manager.init();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('init', () => {
    it('初期化時に既存タブを読み込む', () => {
      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(3);
    });
  });

  describe('onTabActivated', () => {
    it('タブのアクティブ化でlastAccessedが更新される', () => {
      const before = manager.getAllTabs().find((t) => t.id === 1)?.lastAccessed;
      vi.advanceTimersByTime(100);
      manager.onTabActivated(1);
      const after = manager.getAllTabs().find((t) => t.id === 1)?.lastAccessed;
      expect(after).toBeGreaterThan(before ?? 0);
    });
  });

  describe('getRecentTabs', () => {
    it('MRU順で返す（最近アクセスしたものが先頭）', () => {
      vi.advanceTimersByTime(10);
      manager.onTabActivated(3);
      vi.advanceTimersByTime(10);
      manager.onTabActivated(1);

      const tabs = manager.getRecentTabs();
      expect(tabs[0].id).toBe(1);
      expect(tabs[1].id).toBe(3);
    });

    it('limit を指定すると件数を制限できる', () => {
      const tabs = manager.getRecentTabs(2);
      expect(tabs).toHaveLength(2);
    });
  });

  describe('getAllTabs', () => {
    it('全タブをMRU順で返す', () => {
      vi.advanceTimersByTime(10);
      manager.onTabActivated(2);
      vi.advanceTimersByTime(10);
      manager.onTabActivated(3);
      vi.advanceTimersByTime(10);
      manager.onTabActivated(1);

      const tabs = manager.getAllTabs();
      expect(tabs[0].id).toBe(1);
      expect(tabs[1].id).toBe(3);
      expect(tabs[2].id).toBe(2);
    });
  });

  describe('onTabRemoved', () => {
    it('タブが削除される', () => {
      manager.onTabRemoved(2);
      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(2);
      expect(tabs.find((t) => t.id === 2)).toBeUndefined();
    });
  });

  describe('onTabUpdated', () => {
    it('メタデータが更新される', () => {
      manager.onTabUpdated(
        1,
        'Gmail - Inbox (3)',
        'https://mail.google.com/inbox',
        'https://mail.google.com/favicon.ico',
      );
      const tab = manager.getAllTabs().find((t) => t.id === 1);
      expect(tab?.title).toBe('Gmail - Inbox (3)');
      expect(tab?.url).toBe('https://mail.google.com/inbox');
    });

    it('メタデータ更新ではMRU順は変わらない', () => {
      vi.advanceTimersByTime(10);
      manager.onTabActivated(1);
      vi.advanceTimersByTime(10);
      manager.onTabActivated(2);

      const beforeOrder = manager.getAllTabs().map((t) => t.id);
      manager.onTabUpdated(1, 'Updated', 'https://updated.com', '');
      const afterOrder = manager.getAllTabs().map((t) => t.id);

      expect(afterOrder).toEqual(beforeOrder);
    });
  });
});
