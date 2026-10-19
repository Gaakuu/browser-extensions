import { forgetTab, recordActivation, replaceTab } from './mru';

/**
 * MRU の順番を chrome.storage.session に置く。
 * Service Worker は 30 秒ほどで止まるため、メモリに持つと順番が消える。
 * session は再起動までは残り、ポップアップからも直接読める。
 */
const KEY = 'mruOrder';
const MODE_KEY = 'pendingPopupMode';

export async function loadOrder(): Promise<number[]> {
  const result = await chrome.storage.session.get(KEY);
  const order = result[KEY];
  return Array.isArray(order) ? order.filter((id): id is number => typeof id === 'number') : [];
}

// イベントが続けて来ても読み書きが入れ違わないよう、更新は1本の列で順に行う
let queue: Promise<unknown> = Promise.resolve();

function update(change: (order: number[]) => number[]): Promise<void> {
  const next = queue.then(async () => {
    const order = await loadOrder();
    await chrome.storage.session.set({ [KEY]: change(order) });
  });
  queue = next.catch(() => undefined);
  return next;
}

export const MruStore = {
  activated: (tabId: number) => update((order) => recordActivation(order, tabId)),
  removed: (tabId: number) => update((order) => forgetTab(order, tabId)),
  replaced: (addedId: number, removedId: number) =>
    update((order) => replaceTab(order, addedId, removedId)),
};

/** 検索のショートカットで開いたことをポップアップに伝える（1回読んだら消す） */
export async function setPendingMode(mode: 'search', now = Date.now()): Promise<void> {
  await chrome.storage.session.set({ [MODE_KEY]: { mode, at: now } });
}

/** ポップアップが開けなかったときの残りを拾わないよう、数秒より古いものは捨てる */
const PENDING_TTL_MS = 3000;

export async function takePendingMode(now = Date.now()): Promise<'search' | null> {
  const result = await chrome.storage.session.get(MODE_KEY);
  const pending = result[MODE_KEY] as { mode?: unknown; at?: unknown } | undefined;
  if (pending == null) return null;
  await chrome.storage.session.remove(MODE_KEY);
  const fresh = typeof pending.at === 'number' && now - pending.at <= PENDING_TTL_MS;
  return fresh && pending.mode === 'search' ? 'search' : null;
}

export async function clearPendingMode(): Promise<void> {
  await chrome.storage.session.remove(MODE_KEY);
}
