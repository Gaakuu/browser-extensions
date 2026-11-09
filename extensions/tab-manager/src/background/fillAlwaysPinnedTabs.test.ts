import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from '../core/settings';
import { fillAlwaysPinnedTabs } from './fillAlwaysPinnedTabs';

let storage: Record<string, unknown>;
const query = vi.fn();
const create = vi.fn();
const getAllWindows = vi.fn();
let session: Record<string, unknown>;
const noWait = () => Promise.resolve();

const win = (overrides: Partial<chrome.windows.Window> = {}) =>
  ({ id: 10, type: 'normal', incognito: false, ...overrides }) as chrome.windows.Window;

beforeEach(() => {
  storage = { [SETTINGS_KEY]: { alwaysPinnedUrls: ['https://mail/', 'https://calendar/'] } };
  query
    .mockReset()
    .mockResolvedValue([{ id: 1, index: 0, pinned: false, url: 'chrome://newtab/' }]);
  create.mockReset().mockResolvedValue({});
  getAllWindows.mockReset().mockResolvedValue([{ id: 10, type: 'normal', incognito: false }]);
  session = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (key: string, cb: (r: Record<string, unknown>) => void) => cb({ [key]: storage[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(storage, items);
          cb();
        },
      },
      session: {
        get: async (key: string) => ({ [key]: session[key] }),
        set: async (items: Record<string, unknown>) => {
          Object.assign(session, items);
        },
      },
    },
    windows: { getAll: getAllWindows },
    tabs: { query, create },
  });
});

describe('fillAlwaysPinnedTabs', () => {
  it('新しいウィンドウに、設定の順で固定タブを裏で開く', async () => {
    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(2);

    expect(query).toHaveBeenCalledWith({ windowId: 10 });
    expect(create.mock.calls.map(([arg]) => arg)).toEqual([
      { windowId: 10, url: 'https://mail/', pinned: true, active: false },
      { windowId: 10, url: 'https://calendar/', pinned: true, active: false },
    ]);
  });

  it('固定タブがもうあるウィンドウには開かない', async () => {
    query.mockResolvedValue([{ id: 1, index: 0, pinned: true, url: 'https://mail/' }]);

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('シークレット・ポップアップのウィンドウには開かない', async () => {
    await expect(fillAlwaysPinnedTabs(win({ incognito: true }), noWait)).resolves.toBe(0);
    await expect(fillAlwaysPinnedTabs(win({ type: 'popup' }), noWait)).resolves.toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it('固定タブの同期をオフにしていれば開かない', async () => {
    storage = {
      [SETTINGS_KEY]: { alwaysPinnedUrls: ['https://mail/'], syncPinnedTabs: false },
    };

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('登録一覧が空なら、ほかのウィンドウで開いている固定タブを登録して開く', async () => {
    storage = {};
    getAllWindows.mockResolvedValue([
      { id: 10, type: 'normal', incognito: false },
      { id: 20, type: 'normal', incognito: false },
    ]);
    query.mockImplementation(async (q: { windowId: number; pinned?: boolean }) => {
      if (q.windowId === 20 && q.pinned) {
        return [
          { id: 7, windowId: 20, index: 1, pinned: true, url: 'https://calendar/' },
          { id: 6, windowId: 20, index: 0, pinned: true, url: 'https://mail/' },
        ];
      }
      if (q.windowId === 10 && !q.pinned) {
        return [{ id: 1, index: 0, pinned: false, url: 'chrome://newtab/' }];
      }
      return [];
    });

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(2);

    expect((storage[SETTINGS_KEY] as { alwaysPinnedUrls: string[] }).alwaysPinnedUrls).toEqual([
      'https://mail/',
      'https://calendar/',
    ]);
    expect(create.mock.calls.map(([arg]) => arg.url)).toEqual([
      'https://mail/',
      'https://calendar/',
    ]);
  });

  it('登録一覧が空で、どこにも固定タブが無ければ何もしない', async () => {
    storage = {};

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('待っている間にウィンドウが閉じられたら何もしない', async () => {
    query.mockRejectedValue(new Error('No window with id: 10'));

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
