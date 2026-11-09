import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { loadOrder } from '../core/MruStore';
import { createSessionStorageMock } from '../test/chromeMock';
import { registerBackground } from './registerBackground';

type Listener = (...args: never[]) => unknown;

const storage = createSessionStorageMock();
const listeners: Record<string, Listener> = {};
const on = (name: string) => ({
  addListener: (cb: Listener) => {
    listeners[name] = cb;
  },
});
const fire = (name: string, ...args: unknown[]) =>
  (listeners[name] as (...a: unknown[]) => unknown)(...args);

// MruStore の書き込みは非同期の列で進むので、終わるまで待つ
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const WINDOW_TABS = [
  { id: 1, windowId: 100, index: 0, active: true, title: 'Gmail', url: 'https://mail.google.com' },
  { id: 2, windowId: 100, index: 1, active: false, title: 'GitHub', url: 'https://github.com' },
  { id: 3, windowId: 100, index: 2, active: false, title: 'Settings', url: 'chrome://settings' },
];

const tabsUpdate = vi.fn();
const openPopup = vi.fn();
const openOptionsPage = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  storage.reset();
  vi.stubGlobal('chrome', {
    storage: { session: storage.session },
    runtime: {
      onInstalled: on('installed'),
      openOptionsPage,
      getURL: (path: string) => `chrome-extension://abc${path}`,
    },
    tabs: {
      TAB_ID_NONE: -1,
      query: vi.fn(async () => WINDOW_TABS),
      update: tabsUpdate,
      onActivated: on('activated'),
      onRemoved: on('removed'),
      onReplaced: on('replaced'),
    },
    commands: { onCommand: on('command') },
    action: { openPopup },
  });
  registerBackground();
});

describe('registerBackground', () => {
  it('インストール時に設定ページを開く', () => {
    fire('installed', { reason: 'install' });
    expect(openOptionsPage).toHaveBeenCalled();
  });

  it('タブのアクティブ化・削除・差し替えを MRU に記録する', async () => {
    fire('activated', { tabId: 2, windowId: 100 });
    fire('activated', { tabId: 3, windowId: 100 });
    fire('activated', { tabId: 1, windowId: 100 });
    fire('removed', 3);
    fire('replaced', 20, 2);
    await settle();
    expect(await loadOrder()).toEqual([1, 20]);
  });

  describe('previous-tab コマンド', () => {
    it('直前に使ったタブへ切り替える（chrome:// のタブでも）', async () => {
      fire('activated', { tabId: 3, windowId: 100 });
      fire('activated', { tabId: 1, windowId: 100 });
      await settle();
      fire('command', 'previous-tab');
      await settle();
      expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
    });

    it('タブが1つしかなければ何もしない', async () => {
      (chrome.tabs.query as unknown as Mock).mockResolvedValueOnce([WINDOW_TABS[0]]);
      fire('command', 'previous-tab');
      await settle();
      expect(tabsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('search-tabs コマンド', () => {
    it('検索モードを残してポップアップを開く', async () => {
      fire('command', 'search-tabs');
      await settle();
      expect(openPopup).toHaveBeenCalled();
      expect(storage.data.pendingPopupMode).toMatchObject({ mode: 'search' });
    });

    it('ポップアップが開けなかったら検索モードを消す', async () => {
      openPopup.mockRejectedValueOnce(new Error('no focused window'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      fire('command', 'search-tabs');
      await settle();
      expect(storage.data.pendingPopupMode).toBeUndefined();
    });
  });
});
