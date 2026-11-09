import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from '../core/settings';
import { fillAlwaysPinnedTabs } from './fillAlwaysPinnedTabs';

let storage: Record<string, unknown>;
const query = vi.fn();
const create = vi.fn();
const noWait = () => Promise.resolve();

const win = (overrides: Partial<chrome.windows.Window> = {}) =>
  ({ id: 10, type: 'normal', incognito: false, ...overrides }) as chrome.windows.Window;

beforeEach(() => {
  storage = { [SETTINGS_KEY]: { alwaysPinnedUrls: ['https://mail/', 'https://calendar/'] } };
  query
    .mockReset()
    .mockResolvedValue([{ id: 1, index: 0, pinned: false, url: 'chrome://newtab/' }]);
  create.mockReset().mockResolvedValue({});
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (key: string, cb: (r: Record<string, unknown>) => void) => cb({ [key]: storage[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(storage, items);
          cb();
        },
      },
    },
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

  it('設定が空なら何もしない', async () => {
    storage = {};

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it('待っている間にウィンドウが閉じられたら何もしない', async () => {
    query.mockRejectedValue(new Error('No window with id: 10'));

    await expect(fillAlwaysPinnedTabs(win(), noWait)).resolves.toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
