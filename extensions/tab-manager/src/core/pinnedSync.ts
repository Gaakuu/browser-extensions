/**
 * 固定タブをウィンドウ間でそろえるための純粋関数。
 * 「slot」は登録一覧（Settings.alwaysPinnedUrls）の1件で、登録したときの URL をそのまま ID に使う。
 * 各ウィンドウの固定タブがどの slot に当たるかは、Service Worker が tabId → slot の表で覚えている。
 */

export interface PinnedEntry {
  tab: chrome.tabs.Tab;
  slot: string | undefined;
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host || undefined;
  } catch {
    return undefined;
  }
}

/**
 * ウィンドウの固定タブ（左から順）に slot を割り当てる。
 * 表にあるタブはそのまま。表に無いタブ（Chrome を起動し直した直後など）は、
 * まだ使われていない slot のうち URL が同じもの → ホストが同じものの順で当てる。
 * skipTabId のタブには当てない（いま固定したばかりのタブを、別の slot と取り違えないため）。
 */
export function assignSlots(
  pinnedTabs: chrome.tabs.Tab[],
  slotMap: Record<string, string>,
  list: string[],
  skipTabId?: number,
): PinnedEntry[] {
  const tabs = [...pinnedTabs].sort((a, b) => a.index - b.index);
  const used = new Set<string>();
  const result = tabs.map((tab): PinnedEntry => {
    const known = tab.id != null ? slotMap[String(tab.id)] : undefined;
    if (known && list.includes(known)) used.add(known);
    return { tab, slot: known && list.includes(known) ? known : undefined };
  });

  const unused = () => list.filter((slot) => !used.has(slot));
  for (const entry of result) {
    if (entry.slot || entry.tab.id === skipTabId) continue;
    const url = entry.tab.url || entry.tab.pendingUrl;
    const host = hostOf(url);
    const slot =
      unused().find((s) => s === url) ?? unused().find((s) => host && hostOf(s) === host);
    if (slot) {
      entry.slot = slot;
      used.add(slot);
    }
  }
  return result;
}

/** left の slot のすぐ後ろに url を入れる。left が無ければ先頭。すでにあれば何もしない */
export function insertSlot(list: string[], url: string, left: string | undefined): string[] {
  if (list.includes(url)) return list;
  const at = left ? list.indexOf(left) + 1 : 0;
  return [...list.slice(0, at), url, ...list.slice(at)];
}

/**
 * あるウィンドウでの固定タブの並び（slot の列）に合わせて一覧を並べ替える。
 * そのウィンドウに無い slot（そのウィンドウでだけ閉じたもの）は、今の位置のまま動かさない。
 */
export function reorderSlots(list: string[], orderInWindow: string[]): string[] {
  const present = [...new Set(orderInWindow.filter((slot) => list.includes(slot)))];
  const presentSet = new Set(present);
  let k = 0;
  return list.map((slot) => (presentSet.has(slot) ? present[k++] : slot));
}

/** ウィンドウに slot を開くときの位置（そのウィンドウの固定タブのうち、一覧で slot より前にある数） */
export function insertIndex(list: string[], slotsInWindow: string[], slot: string): number {
  const before = new Set(list.slice(0, list.indexOf(slot)));
  return slotsInWindow.filter((s) => before.has(s)).length;
}

export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * 固定タブに戻ってきたとき、登録した URL に戻すか。
 * 前に見ていた時刻（lastSeen）が分からないときは戻さない（Chrome を起動し直した直後など）。
 */
export function shouldResetPinned(
  lastSeen: number | undefined,
  now: number,
  afterMinutes: number,
): boolean {
  if (afterMinutes <= 0 || lastSeen === undefined) return false;
  return now - lastSeen >= afterMinutes * 60 * 1000;
}
