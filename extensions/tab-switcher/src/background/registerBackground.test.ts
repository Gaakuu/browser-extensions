import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBackground } from './registerBackground';
import { TabHistoryManager } from './TabHistoryManager';

type CommandListener = (command: string) => void | Promise<void>;
type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined;
type TabActivatedListener = (info: { tabId: number }) => void;
type TabCreatedListener = (tab: chrome.tabs.Tab) => void;
type TabRemovedListener = (tabId: number) => void;
type TabUpdatedListener = (
  tabId: number,
  changeInfo: Record<string, unknown>,
  tab: chrome.tabs.Tab,
) => void;
type InstalledListener = (details: { reason: string }) => void;

const INITIAL_TABS = [
  { id: 1, title: 'Gmail', url: 'https://mail.google.com', favIconUrl: '' },
  { id: 2, title: 'GitHub', url: 'https://github.com', favIconUrl: '' },
  { id: 3, title: 'Slack', url: 'https://slack.com', favIconUrl: '' },
];

describe('registerBackground', () => {
  let manager: TabHistoryManager;
  let commandListener: CommandListener;
  let messageListener: MessageListener;
  let tabActivatedListener: TabActivatedListener;
  let tabCreatedListener: TabCreatedListener;
  let tabRemovedListener: TabRemovedListener;
  let tabUpdatedListener: TabUpdatedListener;
  let installedListener: InstalledListener;

  const mockTabsSendMessage = vi.fn();
  const mockTabsQuery = vi.fn();
  const mockTabsUpdate = vi.fn();
  const mockTabsRemove = vi.fn();
  const mockOpenOptionsPage = vi.fn();

  // アクティブタブの ID を変更可能にする
  let activeTabId: number | undefined = 1;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    activeTabId = 1;

    mockTabsQuery.mockImplementation((query: { active?: boolean }) => {
      if (query.active) {
        return Promise.resolve(activeTabId != null ? [{ id: activeTabId }] : []);
      }
      return Promise.resolve(INITIAL_TABS);
    });

    vi.stubGlobal('chrome', {
      runtime: {
        onInstalled: {
          addListener: (cb: InstalledListener) => {
            installedListener = cb;
          },
        },
        onMessage: {
          addListener: (cb: MessageListener) => {
            messageListener = cb;
          },
        },
        openOptionsPage: mockOpenOptionsPage,
      },
      tabs: {
        query: mockTabsQuery,
        sendMessage: mockTabsSendMessage,
        update: mockTabsUpdate,
        remove: mockTabsRemove,
        onActivated: {
          addListener: (cb: TabActivatedListener) => {
            tabActivatedListener = cb;
          },
        },
        onCreated: {
          addListener: (cb: TabCreatedListener) => {
            tabCreatedListener = cb;
          },
        },
        onRemoved: {
          addListener: (cb: TabRemovedListener) => {
            tabRemovedListener = cb;
          },
        },
        onUpdated: {
          addListener: (cb: TabUpdatedListener) => {
            tabUpdatedListener = cb;
          },
        },
      },
      commands: {
        onCommand: {
          addListener: (cb: CommandListener) => {
            commandListener = cb;
          },
        },
      },
    });

    manager = new TabHistoryManager();
    await manager.init();
    registerBackground(manager);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('show-tab-switcher コマンド', () => {
    it('初回呼び出しでアクティブタブに SHOW_SWITCHER を送信する', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      const [tabIdArg, messageArg] = mockTabsSendMessage.mock.calls[0];
      expect(tabIdArg).toBe(1);
      expect(messageArg.type).toBe('SHOW_SWITCHER');
      expect(messageArg.tabs).toHaveLength(3);
    });

    it('同一タブで2回目の呼び出しは MOVE_FOCUS_DOWN を送信する', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');
      mockTabsSendMessage.mockClear();

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'MOVE_FOCUS_DOWN' });
    });

    it('別タブに切り替わると再度 SHOW_SWITCHER を送信する', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');
      mockTabsSendMessage.mockClear();

      activeTabId = 2;
      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      const [tabIdArg, messageArg] = mockTabsSendMessage.mock.calls[0];
      expect(tabIdArg).toBe(2);
      expect(messageArg.type).toBe('SHOW_SWITCHER');
    });

    it('Content Script が無いページではフォールバックで前タブに切り替える', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('Receiving end does not exist'));

      await commandListener('show-tab-switcher');

      // INITIAL_TABS は同時刻なので getRecentTabs(2) は [tab1, tab2]、
      // active は tab1 なので previousTab = tab2 → tab2 をアクティブ化
      expect(mockTabsUpdate).toHaveBeenCalledWith(2, { active: true });
    });

    it('フォールバック時に該当タブが無ければ何もしない', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('No content script'));

      // tab 2 と 3 を削除して履歴を tab1 のみにする
      tabRemovedListener(2);
      tabRemovedListener(3);

      await commandListener('show-tab-switcher');

      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });

    it('アクティブタブが取得できなければ何もしない', async () => {
      activeTabId = undefined;

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).not.toHaveBeenCalled();
      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });

    it('sendMessage 失敗後は switcherVisibleTabId が記録されないので次回も SHOW_SWITCHER', async () => {
      mockTabsSendMessage.mockRejectedValueOnce(new Error('fail'));
      await commandListener('show-tab-switcher');

      mockTabsSendMessage.mockResolvedValue(undefined);
      mockTabsSendMessage.mockClear();

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      expect(mockTabsSendMessage.mock.calls[0][1].type).toBe('SHOW_SWITCHER');
    });
  });

  describe('search-tabs コマンド', () => {
    it('アクティブタブに SHOW_SEARCH と全タブを送信する', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('search-tabs');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      const [tabIdArg, messageArg] = mockTabsSendMessage.mock.calls[0];
      expect(tabIdArg).toBe(1);
      expect(messageArg.type).toBe('SHOW_SEARCH');
      expect(messageArg.tabs).toHaveLength(3);
    });

    it('sendMessage 失敗時にエラーを投げない', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('No content script'));

      await expect(commandListener('search-tabs')).resolves.not.toThrow();
    });
  });

  describe('未知のコマンド', () => {
    it('何もしない', async () => {
      await commandListener('unknown-command');

      expect(mockTabsSendMessage).not.toHaveBeenCalled();
      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Content Script からのメッセージ', () => {
    it('SWITCH_TO_TAB で対象タブをアクティブ化する', () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'SWITCH_TO_TAB', tabId: 2 }, {}, sendResponse);

      expect(mockTabsUpdate).toHaveBeenCalledWith(2, { active: true });
    });

    it('SWITCH_TO_TAB 後は switcherVisibleTabId がクリアされ次回も SHOW_SWITCHER が送信される', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      // 初回 SHOW_SWITCHER で switcherVisibleTabId = 1 になる
      await commandListener('show-tab-switcher');

      // SWITCH_TO_TAB で状態リセット
      const sendResponse = vi.fn();
      messageListener({ type: 'SWITCH_TO_TAB', tabId: 2 }, {}, sendResponse);

      mockTabsSendMessage.mockClear();
      // 同じタブで再度 → MOVE_FOCUS_DOWN ではなく SHOW_SWITCHER が来るはず
      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage.mock.calls[0][1].type).toBe('SHOW_SWITCHER');
    });

    it('CLOSE_TAB で対象タブを削除する', () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'CLOSE_TAB', tabId: 3 }, {}, sendResponse);

      expect(mockTabsRemove).toHaveBeenCalledWith(3);
    });

    it('OVERLAY_CLOSED で switcherVisibleTabId をクリアする', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');

      const sendResponse = vi.fn();
      messageListener({ type: 'OVERLAY_CLOSED' }, {}, sendResponse);

      mockTabsSendMessage.mockClear();
      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage.mock.calls[0][1].type).toBe('SHOW_SWITCHER');
    });

    it('GET_ALL_TABS で全タブを sendResponse で返す', () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'GET_ALL_TABS' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledTimes(1);
      const response = sendResponse.mock.calls[0][0];
      expect(response.tabs).toHaveLength(3);
    });

    it('onMessage リスナーは true を返す（非同期 sendResponse 用）', () => {
      const result = messageListener({ type: 'GET_ALL_TABS' }, {}, vi.fn());
      expect(result).toBe(true);
    });
  });

  describe('chrome.tabs イベント', () => {
    it('onActivated で manager.onTabActivated が呼ばれ MRU が更新される', () => {
      vi.advanceTimersByTime(100);
      tabActivatedListener({ tabId: 3 });

      const tabs = manager.getAllTabs();
      expect(tabs[0].id).toBe(3);
    });

    it('onCreated で新規タブが追加され先頭に来る', () => {
      vi.advanceTimersByTime(100);
      tabCreatedListener({
        id: 99,
        title: 'New Tab',
        url: 'https://new.example.com',
        favIconUrl: '',
      } as chrome.tabs.Tab);

      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(4);
      expect(tabs[0].id).toBe(99);
    });

    it('onCreated で id が無いタブは無視される', () => {
      tabCreatedListener({ title: 'No Id' } as chrome.tabs.Tab);

      expect(manager.getAllTabs()).toHaveLength(3);
    });

    it('onRemoved で manager から削除される', () => {
      tabRemovedListener(2);

      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(2);
      expect(tabs.find((t) => t.id === 2)).toBeUndefined();
    });

    it('onUpdated で title/url が更新される', () => {
      tabUpdatedListener(1, { title: 'Updated' }, {
        id: 1,
        title: 'Gmail Updated',
        url: 'https://mail.google.com/inbox',
        favIconUrl: '',
      } as chrome.tabs.Tab);

      const tab = manager.getAllTabs().find((t) => t.id === 1);
      expect(tab?.title).toBe('Gmail Updated');
      expect(tab?.url).toBe('https://mail.google.com/inbox');
    });

    it('onUpdated で title も url も無い場合は何もしない', () => {
      const before = manager.getAllTabs().find((t) => t.id === 1)?.title;

      tabUpdatedListener(1, { status: 'loading' }, {
        id: 1,
        title: '',
        url: '',
      } as chrome.tabs.Tab);

      const after = manager.getAllTabs().find((t) => t.id === 1)?.title;
      expect(after).toBe(before);
    });
  });

  describe('chrome.runtime.onInstalled', () => {
    it('install 時にオプションページを開く', () => {
      installedListener({ reason: 'install' });

      expect(mockOpenOptionsPage).toHaveBeenCalledTimes(1);
    });

    it('update 時はオプションページを開かない', () => {
      installedListener({ reason: 'update' });

      expect(mockOpenOptionsPage).not.toHaveBeenCalled();
    });
  });
});
