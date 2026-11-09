import { isPinnableUrl, pinnedUrlsOf } from '../core/alwaysPinned';
import {
  assignSlots,
  insertIndex,
  insertSlot,
  type PinnedEntry,
  reorderSlots,
  sameOrder,
  shouldResetPinned,
} from '../core/pinnedSync';
import { loadSettings, saveSettings } from '../core/settings';
import { deleteSlots, loadSlotMap, setSlots } from './slotMap';

const SEEN_KEY = 'tabLastSeen';
const ACTIVE_KEY = 'activeTabByWindow';

/*
 * 固定タブをウィンドウ間でそろえる。
 * - あるウィンドウで固定した → 一覧に足し、ほかのウィンドウにも同じ位置で開く
 * - あるウィンドウで固定を外した → 一覧から外し、ほかのウィンドウからも閉じる
 * - あるウィンドウで固定タブを並べ替えた → 一覧とほかのウィンドウを同じ順にする
 * - 固定タブを閉じた → そのウィンドウだけ（うっかり ⌘W で全部消えないように）
 * 拡張自身の操作でもイベントが来るので、どの処理も「今の状態と違うところだけ直す」形にして、
 * 二度目に呼ばれても何もしないようにしてある。処理は1つずつ順に流す。
 */

let queue: Promise<void> = Promise.resolve();

/** 処理を1つずつ順に流す（同時に動くと一覧の読み書きが食い違う） */
export function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.then(task).catch((error) => {
    console.warn('[tab-manager] pinned tab sync failed', error);
  });
  return queue;
}

async function isSyncWindow(windowId: number): Promise<boolean> {
  try {
    const win = await chrome.windows.get(windowId);
    return win.type === 'normal' && !win.incognito;
  } catch {
    return false;
  }
}

async function otherWindows(windowId: number): Promise<chrome.windows.Window[]> {
  const wins = await chrome.windows.getAll({ windowTypes: ['normal'] });
  return wins.filter((w) => w.id != null && w.id !== windowId && !w.incognito);
}

/** ウィンドウの固定タブと slot の対応。新しく当てたものは表に書き足す */
async function pinnedEntries(
  windowId: number,
  list: string[],
  skipTabId?: number,
): Promise<PinnedEntry[]> {
  const tabs = await chrome.tabs.query({ windowId, pinned: true });
  const map = await loadSlotMap();
  const entries = assignSlots(tabs, map, list, skipTabId);
  const added = entries
    .filter((e) => e.slot && e.tab.id != null && map[String(e.tab.id)] !== e.slot)
    .map((e) => [e.tab.id as number, e.slot as string] as [number, string]);
  if (added.length > 0) await setSlots(added);
  return entries;
}

const slotsOf = (entries: PinnedEntry[]) =>
  entries.map((e) => e.slot).filter((s): s is string => !!s);

/**
 * 登録一覧が空なら、今開いている固定タブで埋める（いちばん固定タブの多いウィンドウを使う）。
 * 設定で「登録する」を押していなくても、すでに固定しているタブが新しいウィンドウに出るように。
 * 同期がオフ、または一覧がもうあるときは今の一覧を返す。
 */
export async function seedPinnedList(excludeWindowId?: number): Promise<string[]> {
  const settings = await loadSettings();
  if (!settings.syncPinnedTabs || settings.alwaysPinnedUrls.length > 0) {
    return settings.alwaysPinnedUrls;
  }
  const wins = (await chrome.windows.getAll({ windowTypes: ['normal'] })).filter(
    (w) => w.id != null && w.id !== excludeWindowId && !w.incognito,
  );
  let best: chrome.tabs.Tab[] = [];
  for (const win of wins) {
    const pinned = await chrome.tabs.query({ windowId: win.id, pinned: true });
    if (pinnedUrlsOf(pinned).length > pinnedUrlsOf(best).length) best = pinned;
  }
  const urls = pinnedUrlsOf(best);
  if (urls.length === 0) return [];

  await saveSettings({ ...settings, alwaysPinnedUrls: urls });
  await pinnedEntries(best[0].windowId, urls);
  return urls;
}

/** タブを固定した */
export async function handlePinned(tab: chrome.tabs.Tab): Promise<void> {
  const settings = await loadSettings();
  if (!settings.syncPinnedTabs || tab.id == null) return;
  if (!(await isSyncWindow(tab.windowId))) return;
  const url = tab.url || tab.pendingUrl;
  if (!isPinnableUrl(url)) return;

  const map = await loadSlotMap();
  if (map[String(tab.id)]) return; // 拡張が開いたタブ、またはもう分かっているタブ
  const list = settings.alwaysPinnedUrls;
  if (list.includes(url)) {
    // 同じページの slot がもうある。このタブをそれに当てるだけで、ほかには開かない
    await setSlots([[tab.id, url]]);
    return;
  }

  const entries = await pinnedEntries(tab.windowId, list, tab.id);
  const pos = entries.findIndex((e) => e.tab.id === tab.id);
  const left = entries
    .slice(0, Math.max(pos, 0))
    .reverse()
    .find((e) => e.slot)?.slot;
  const next = insertSlot(list, url, left);
  await saveSettings({ ...settings, alwaysPinnedUrls: next });
  await setSlots([[tab.id, url]]);

  for (const win of await otherWindows(tab.windowId)) {
    const others = await pinnedEntries(win.id as number, next);
    const index = insertIndex(next, slotsOf(others), url);
    const created = await chrome.tabs.create({
      windowId: win.id,
      url,
      pinned: true,
      active: false,
      index,
    });
    if (created.id != null) await setSlots([[created.id, url]]);
  }
}

/**
 * 固定タブを閉じたときも、Chrome は閉じる途中で「固定を外した」を知らせてくる。
 * 少し待ってからタブがまだあるかを見て、閉じたのか外したのかを見分ける。
 */
export const UNPIN_SETTLE_MS = 300;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** タブの固定を外した */
export async function handleUnpinned(
  tab: chrome.tabs.Tab,
  settle: () => Promise<void> = () => sleep(UNPIN_SETTLE_MS),
): Promise<void> {
  const settings = await loadSettings();
  if (!settings.syncPinnedTabs || tab.id == null) return;

  await settle();
  let current: chrome.tabs.Tab;
  try {
    current = await chrome.tabs.get(tab.id);
  } catch {
    await deleteSlots([tab.id]); // 閉じた。そのウィンドウだけのことなので、ほかは触らない
    return;
  }
  if (current.pinned) return; // すぐ固定し直した
  if (!(await isSyncWindow(tab.windowId))) return;

  const list = settings.alwaysPinnedUrls;
  // 外したあとなので tab.pinned は false。表か、URL・ホストで当てる
  const slot =
    (await loadSlotMap())[String(tab.id)] ??
    assignSlots([{ ...tab, pinned: true }], {}, list)[0]?.slot;
  await deleteSlots([tab.id]);
  if (!slot) return;

  await saveSettings({ ...settings, alwaysPinnedUrls: list.filter((s) => s !== slot) });

  for (const win of await otherWindows(tab.windowId)) {
    const ids = (await pinnedEntries(win.id as number, list))
      .filter((e) => e.slot === slot && e.tab.id != null)
      .map((e) => e.tab.id as number);
    if (ids.length === 0) continue;
    await deleteSlots(ids);
    await chrome.tabs.remove(ids);
  }
}

/** 固定タブを並べ替えた */
export async function handleMoved(tabId: number): Promise<void> {
  const settings = await loadSettings();
  if (!settings.syncPinnedTabs) return;
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  if (!tab.pinned || !(await isSyncWindow(tab.windowId))) return;

  const list = settings.alwaysPinnedUrls;
  const next = reorderSlots(list, slotsOf(await pinnedEntries(tab.windowId, list)));
  if (sameOrder(list, next)) return; // 拡張自身が動かしたときもここで止まる
  await saveSettings({ ...settings, alwaysPinnedUrls: next });

  for (const win of await otherWindows(tab.windowId)) {
    const entries = await pinnedEntries(win.id as number, next);
    const current = slotsOf(entries);
    const desired = next.filter((slot) => current.includes(slot));
    if (sameOrder(current, desired)) continue;
    for (const [index, slot] of desired.entries()) {
      const id = entries.find((e) => e.slot === slot)?.tab.id;
      if (id != null) await chrome.tabs.move(id, { index });
    }
  }
}

/** 固定タブを閉じた（そのウィンドウだけ。表から消すだけ） */
export async function handleRemoved(tabId: number): Promise<void> {
  await deleteSlots([tabId]);
}

/** 固定タブを、登録したときの URL に開き直す */
async function resetPinnedTab(tab: chrome.tabs.Tab): Promise<boolean> {
  if (!tab.pinned || tab.id == null) return false;
  const { alwaysPinnedUrls } = await loadSettings();
  const slot = (await pinnedEntries(tab.windowId, alwaysPinnedUrls)).find(
    (e) => e.tab.id === tab.id,
  )?.slot;
  if (!slot) return false;
  if (tab.url !== slot) await chrome.tabs.update(tab.id, { url: slot });
  return true;
}

/** 今の固定タブを、登録したときの URL に開き直す（⌥⇧R） */
export async function resetActivePinnedTab(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab ? resetPinnedTab(tab) : false;
}

/**
 * タブが前に出た。直前に出ていたタブと、今出たタブの「最後に見た時刻」を記録し、
 * しばらく見ていなかった固定タブなら登録した URL に戻す。戻したら true。
 * Chrome の lastAccessed はこのイベントの時点でもう今の時刻になっていることがあるので、自分で記録する。
 */
export async function handleActivated(
  tabId: number,
  windowId: number,
  now = Date.now(),
): Promise<boolean> {
  const stored = await chrome.storage.session.get([SEEN_KEY, ACTIVE_KEY]);
  const seen = (stored[SEEN_KEY] as Record<string, number> | undefined) ?? {};
  const active = (stored[ACTIVE_KEY] as Record<string, number> | undefined) ?? {};

  const previous = active[String(windowId)];
  if (previous !== undefined && previous !== tabId) seen[String(previous)] = now;
  const lastSeen = seen[String(tabId)];
  seen[String(tabId)] = now;
  active[String(windowId)] = tabId;
  await chrome.storage.session.set({ [SEEN_KEY]: seen, [ACTIVE_KEY]: active });

  const { resetPinnedAfterMinutes } = await loadSettings();
  if (!shouldResetPinned(lastSeen, now, resetPinnedAfterMinutes)) return false;
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return false;
  }
  return resetPinnedTab(tab);
}

/** 閉じたタブの「最後に見た時刻」を消す */
export async function forgetLastSeen(tabId: number): Promise<void> {
  const stored = await chrome.storage.session.get(SEEN_KEY);
  const seen = (stored[SEEN_KEY] as Record<string, number> | undefined) ?? {};
  if (!(String(tabId) in seen)) return;
  delete seen[String(tabId)];
  await chrome.storage.session.set({ [SEEN_KEY]: seen });
}
