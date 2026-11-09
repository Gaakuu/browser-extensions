import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from '../core/settings';
import {
  handleMoved,
  handlePinned,
  handleRemoved,
  handleUnpinned,
  resetActivePinnedTab,
} from './pinnedTabSync';

const MAIL = 'https://mail/';
const noWait = () => Promise.resolve();
const CAL = 'https://cal/';
const JIRA = 'https://jira/';

/** Chrome のウィンドウとタブの、テスト用の小さな作り物 */
interface FakeTab {
  id: number;
  windowId: number;
  url: string;
  pinned: boolean;
  active: boolean;
  index: number;
}

let tabs: FakeTab[];
let local: Record<string, unknown>;
let session: Record<string, unknown>;
let nextId: number;
const windows = [
  { id: 1, type: 'normal', incognito: false },
  { id: 2, type: 'normal', incognito: false },
  { id: 3, type: 'normal', incognito: true },
];

function reindex(windowId: number) {
  const inWin = tabs
    .filter((t) => t.windowId === windowId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.index - b.index);
  inWin.forEach((t, i) => {
    t.index = i;
  });
}

function addTab(windowId: number, url: string, pinned: boolean, active = false): FakeTab {
  const tab = { id: nextId++, windowId, url, pinned, active, index: 999 };
  tabs.push(tab);
  reindex(windowId);
  return tab;
}

const pinnedUrls = (windowId: number) =>
  tabs
    .filter((t) => t.windowId === windowId && t.pinned)
    .sort((a, b) => a.index - b.index)
    .map((t) => t.url);

const settings = () => local[SETTINGS_KEY] as { alwaysPinnedUrls: string[] };

function setup(list: string[], sync = true) {
  tabs = [];
  nextId = 1;
  local = { [SETTINGS_KEY]: { alwaysPinnedUrls: list, syncPinnedTabs: sync } };
  session = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (key: string, cb: (r: Record<string, unknown>) => void) => cb({ [key]: local[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(local, items);
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
    windows: {
      get: async (id: number) => {
        const w = windows.find((x) => x.id === id);
        if (!w) throw new Error('No window');
        return w;
      },
      getAll: async () => windows,
    },
    tabs: {
      get: async (id: number) => {
        const t = tabs.find((x) => x.id === id);
        if (!t) throw new Error('No tab');
        return { ...t };
      },
      query: async (q: { windowId?: number; pinned?: boolean; active?: boolean }) =>
        tabs
          .filter(
            (t) =>
              (q.windowId === undefined || t.windowId === q.windowId) &&
              (q.pinned === undefined || t.pinned === q.pinned) &&
              (q.active === undefined || t.active === q.active),
          )
          .map((t) => ({ ...t })),
      create: async (p: { windowId: number; url: string; pinned: boolean; index?: number }) => {
        const tab = addTab(p.windowId, p.url, p.pinned);
        if (p.index !== undefined) {
          tab.index = p.index - 0.5;
          reindex(p.windowId);
        }
        return { ...tab };
      },
      remove: async (ids: number[]) => {
        tabs = tabs.filter((t) => !ids.includes(t.id));
      },
      move: async (id: number, { index }: { index: number }) => {
        const t = tabs.find((x) => x.id === id) as FakeTab;
        t.index = index < t.index ? index - 0.5 : index + 0.5;
        reindex(t.windowId);
      },
      update: vi.fn(async (id: number, { url }: { url: string }) => {
        const t = tabs.find((x) => x.id === id) as FakeTab;
        t.url = url;
      }),
    },
  });
}

/** 2つのウィンドウに、同じ固定タブがそろっている状態 */
async function twoSyncedWindows() {
  setup([MAIL, CAL]);
  for (const w of [1, 2]) {
    addTab(w, MAIL, true);
    addTab(w, CAL, true);
    addTab(w, 'chrome://newtab/', false, true);
  }
}

describe('handlePinned', () => {
  beforeEach(twoSyncedWindows);

  it('固定したタブを一覧に足し、ほかのウィンドウにも同じ位置で開く（シークレットは除く）', async () => {
    const t = addTab(1, JIRA, false);
    t.pinned = true;
    t.index = 0.5; // MAIL と CAL の間で固定した
    reindex(1);

    await handlePinned({ ...t } as chrome.tabs.Tab);

    expect(settings().alwaysPinnedUrls).toEqual([MAIL, JIRA, CAL]);
    expect(pinnedUrls(2)).toEqual([MAIL, JIRA, CAL]);
    expect(pinnedUrls(3)).toEqual([]);
  });

  it('二度呼ばれても増えない', async () => {
    const t = addTab(1, JIRA, true);
    await handlePinned({ ...t } as chrome.tabs.Tab);
    await handlePinned({ ...t } as chrome.tabs.Tab);
    const created = tabs.find((x) => x.windowId === 2 && x.url === JIRA) as FakeTab;
    await handlePinned({ ...created } as chrome.tabs.Tab);

    expect(pinnedUrls(2).filter((u) => u === JIRA)).toHaveLength(1);
    expect(pinnedUrls(1).filter((u) => u === JIRA)).toHaveLength(1);
  });

  it('同期をオフにしていれば何もしない', async () => {
    (local[SETTINGS_KEY] as { syncPinnedTabs: boolean }).syncPinnedTabs = false;
    const t = addTab(1, JIRA, true);

    await handlePinned({ ...t } as chrome.tabs.Tab);

    expect(settings().alwaysPinnedUrls).toEqual([MAIL, CAL]);
    expect(pinnedUrls(2)).toEqual([MAIL, CAL]);
  });
});

describe('handleUnpinned', () => {
  beforeEach(twoSyncedWindows);

  it('固定を外したら一覧から外し、ほかのウィンドウからは閉じる', async () => {
    const t = tabs.find((x) => x.windowId === 1 && x.url === CAL) as FakeTab;
    t.pinned = false;
    reindex(1);

    await handleUnpinned({ ...t } as chrome.tabs.Tab, noWait);

    expect(settings().alwaysPinnedUrls).toEqual([MAIL]);
    expect(pinnedUrls(2)).toEqual([MAIL]);
    expect(tabs.some((x) => x.windowId === 2 && x.url === CAL)).toBe(false);
    // 外したウィンドウではふつうのタブとして残る
    expect(tabs.some((x) => x.windowId === 1 && x.url === CAL && !x.pinned)).toBe(true);
  });

  it('閉じる途中で来た「固定を外した」は、閉じたものとして扱い、ほかのウィンドウは触らない', async () => {
    const t = tabs.find((x) => x.windowId === 1 && x.url === CAL) as FakeTab;
    tabs = tabs.filter((x) => x !== t);

    await handleUnpinned({ ...t, pinned: false } as chrome.tabs.Tab, noWait);

    expect(settings().alwaysPinnedUrls).toEqual([MAIL, CAL]);
    expect(pinnedUrls(2)).toEqual([MAIL, CAL]);
  });
});

describe('handleMoved', () => {
  beforeEach(twoSyncedWindows);

  it('並べ替えたら一覧とほかのウィンドウも同じ順にする', async () => {
    const cal = tabs.find((x) => x.windowId === 1 && x.url === CAL) as FakeTab;
    cal.index = -1;
    reindex(1);

    await handleMoved(cal.id);

    expect(settings().alwaysPinnedUrls).toEqual([CAL, MAIL]);
    expect(pinnedUrls(2)).toEqual([CAL, MAIL]);
  });

  it('並びが変わっていなければ何もしない', async () => {
    const mail = tabs.find((x) => x.windowId === 1 && x.url === MAIL) as FakeTab;
    await handleMoved(mail.id);
    expect(settings().alwaysPinnedUrls).toEqual([MAIL, CAL]);
  });
});

describe('handleRemoved', () => {
  beforeEach(twoSyncedWindows);

  it('固定タブを閉じても、ほかのウィンドウと一覧はそのまま', async () => {
    const cal = tabs.find((x) => x.windowId === 1 && x.url === CAL) as FakeTab;
    tabs = tabs.filter((x) => x !== cal);

    await handleRemoved(cal.id);

    expect(settings().alwaysPinnedUrls).toEqual([MAIL, CAL]);
    expect(pinnedUrls(2)).toEqual([MAIL, CAL]);
  });
});

describe('resetActivePinnedTab', () => {
  beforeEach(twoSyncedWindows);

  it('今の固定タブを、登録したときの URL に開き直す（同期がオフでも）', async () => {
    (local[SETTINGS_KEY] as { syncPinnedTabs: boolean }).syncPinnedTabs = false;
    for (const t of tabs) t.active = false;
    const mail = tabs.find((x) => x.windowId === 1 && x.url === MAIL) as FakeTab;
    mail.active = true;
    mail.url = 'https://mail/#inbox/123';

    await expect(resetActivePinnedTab()).resolves.toBe(true);
    expect(mail.url).toBe(MAIL);
  });

  it('固定タブでなければ何もしない', async () => {
    await expect(resetActivePinnedTab()).resolves.toBe(false);
  });
});
