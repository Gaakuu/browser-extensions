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
  { id: 1, windowId: 100, title: 'Gmail', url: 'https://mail.google.com', favIconUrl: '' },
  { id: 2, windowId: 100, title: 'GitHub', url: 'https://github.com', favIconUrl: '' },
  { id: 3, windowId: 100, title: 'Slack', url: 'https://slack.com', favIconUrl: '' },
  { id: 4, windowId: 200, title: 'Other', url: 'https://other.example.com', favIconUrl: '' },
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
  const mockScriptingExecuteScript = vi.fn();

  // アクティブタブの ID / ウィンドウを変更可能にする
  let activeTabId: number | undefined = 1;
  let activeWindowId: number | undefined = 100;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    activeTabId = 1;
    activeWindowId = 100;

    mockTabsQuery.mockImplementation((query: { active?: boolean }) => {
      if (query.active) {
        return Promise.resolve(
          activeTabId != null ? [{ id: activeTabId, windowId: activeWindowId }] : [],
        );
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
      scripting: {
        executeScript: mockScriptingExecuteScript,
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

    it('現在のウィンドウのタブのみを送信する（別ウィンドウのタブは除外）', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');

      const [, messageArg] = mockTabsSendMessage.mock.calls[0];
      const sentTabIds = messageArg.tabs.map((t: { id: number }) => t.id).sort();
      expect(sentTabIds).toEqual([1, 2, 3]);
      expect(sentTabIds).not.toContain(4);
    });

    it('アクティブウィンドウが切り替わると該当ウィンドウのタブを送る', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      activeTabId = 4;
      activeWindowId = 200;
      await commandListener('show-tab-switcher');

      const [tabIdArg, messageArg] = mockTabsSendMessage.mock.calls[0];
      expect(tabIdArg).toBe(4);
      expect(messageArg.tabs.map((t: { id: number }) => t.id)).toEqual([4]);
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

    it('Content Script 未注入のタブでは executeScript で動的注入し再送信する', async () => {
      // 1回目は Content Script 不在で失敗、注入後の2回目は成功
      mockTabsSendMessage
        .mockRejectedValueOnce(new Error('Receiving end does not exist'))
        .mockResolvedValueOnce(undefined);
      mockScriptingExecuteScript.mockResolvedValue([]);

      await commandListener('show-tab-switcher');

      expect(mockScriptingExecuteScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content-scripts/content.js'],
      });
      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2);
      const [, secondMessage] = mockTabsSendMessage.mock.calls[1];
      expect(secondMessage.type).toBe('SHOW_SWITCHER');
      // 旧仕様の「前タブに切り替える」フォールバックは行わない
      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });

    it('注入後の再送信が成功すると switcherVisibleTabId が記録され次回は MOVE_FOCUS_DOWN', async () => {
      mockTabsSendMessage
        .mockRejectedValueOnce(new Error('Receiving end does not exist'))
        .mockResolvedValueOnce(undefined);
      mockScriptingExecuteScript.mockResolvedValue([]);

      await commandListener('show-tab-switcher');
      mockTabsSendMessage.mockClear();
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, { type: 'MOVE_FOCUS_DOWN' });
    });

    it('executeScript が失敗する制限ページでは何もしない（前タブにも切り替えない）', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('Receiving end does not exist'));
      mockScriptingExecuteScript.mockRejectedValue(new Error('Cannot access chrome:// URL'));

      await commandListener('show-tab-switcher');

      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });

    it('アクティブタブが取得できなければ何もしない', async () => {
      activeTabId = undefined;

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).not.toHaveBeenCalled();
      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
      expect(mockTabsUpdate).not.toHaveBeenCalled();
    });

    it('注入も失敗した場合は switcherVisibleTabId が記録されないので次回も SHOW_SWITCHER', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('fail'));
      mockScriptingExecuteScript.mockRejectedValue(new Error('Cannot access'));

      await commandListener('show-tab-switcher');

      mockTabsSendMessage.mockReset();
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('show-tab-switcher');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      expect(mockTabsSendMessage.mock.calls[0][1].type).toBe('SHOW_SWITCHER');
    });
  });

  describe('search-tabs コマンド', () => {
    it('アクティブタブに SHOW_SEARCH と現在のウィンドウのタブを送信する', async () => {
      mockTabsSendMessage.mockResolvedValue(undefined);

      await commandListener('search-tabs');

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(1);
      const [tabIdArg, messageArg] = mockTabsSendMessage.mock.calls[0];
      expect(tabIdArg).toBe(1);
      expect(messageArg.type).toBe('SHOW_SEARCH');
      expect(messageArg.tabs).toHaveLength(3);
      expect(messageArg.tabs.every((t: { id: number }) => t.id !== 4)).toBe(true);
    });

    it('Content Script 未注入のタブでは executeScript で動的注入し再送信する', async () => {
      mockTabsSendMessage
        .mockRejectedValueOnce(new Error('No content script'))
        .mockResolvedValueOnce(undefined);
      mockScriptingExecuteScript.mockResolvedValue([]);

      await commandListener('search-tabs');

      expect(mockScriptingExecuteScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content-scripts/content.js'],
      });
      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2);
      const [, secondMessage] = mockTabsSendMessage.mock.calls[1];
      expect(secondMessage.type).toBe('SHOW_SEARCH');
    });

    it('executeScript も失敗した場合はエラーを投げず終了する', async () => {
      mockTabsSendMessage.mockRejectedValue(new Error('No content script'));
      mockScriptingExecuteScript.mockRejectedValue(new Error('Cannot access'));

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

    it('GET_ALL_TABS で sender のウィンドウのタブのみ sendResponse で返す', () => {
      const sendResponse = vi.fn();
      messageListener({ type: 'GET_ALL_TABS' }, { tab: { windowId: 100 } }, sendResponse);

      expect(sendResponse).toHaveBeenCalledTimes(1);
      const response = sendResponse.mock.calls[0][0];
      expect(response.tabs).toHaveLength(3);
      expect(response.tabs.every((t: { id: number }) => t.id !== 4)).toBe(true);
    });

    it('onMessage リスナーは true を返す（非同期 sendResponse 用）', () => {
      const result = messageListener({ type: 'GET_ALL_TABS' }, { tab: { windowId: 100 } }, vi.fn());
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
        windowId: 100,
        title: 'New Tab',
        url: 'https://new.example.com',
        favIconUrl: '',
      } as chrome.tabs.Tab);

      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(5);
      expect(tabs[0].id).toBe(99);
      expect(tabs[0].windowId).toBe(100);
    });

    it('onCreated で id が無いタブは無視される', () => {
      tabCreatedListener({ title: 'No Id' } as chrome.tabs.Tab);

      expect(manager.getAllTabs()).toHaveLength(4);
    });

    it('onRemoved で manager から削除される', () => {
      tabRemovedListener(2);

      const tabs = manager.getAllTabs();
      expect(tabs).toHaveLength(3);
      expect(tabs.find((t) => t.id === 2)).toBeUndefined();
    });

    it('onUpdated で title/url が更新される', () => {
      tabUpdatedListener(1, { title: 'Updated' }, {
        id: 1,
        windowId: 100,
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
        windowId: 100,
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
