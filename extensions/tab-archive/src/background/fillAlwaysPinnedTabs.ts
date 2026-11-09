import { urlsToPin } from '../core/alwaysPinned';
import { loadSettings } from '../core/settings';

/**
 * ウィンドウが開いた直後はタブがまだそろっていない（起動時の復元など）ので、少し待ってから見る。
 * Service Worker はイベントのあと 30 秒ほど動いているので、この程度なら待てる。
 */
export const SETTLE_MS = 1500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 新しいふつうのウィンドウに、設定した固定タブを開く。開いた数を返す */
export async function fillAlwaysPinnedTabs(
  win: chrome.windows.Window,
  wait: () => Promise<void> = () => sleep(SETTLE_MS),
): Promise<number> {
  if (win.id == null || win.type !== 'normal' || win.incognito) return 0;
  const { alwaysPinnedUrls } = await loadSettings();
  if (alwaysPinnedUrls.length === 0) return 0;

  await wait();
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ windowId: win.id });
  } catch {
    return 0; // 待っている間にウィンドウが閉じられた
  }

  const urls = urlsToPin(alwaysPinnedUrls, tabs);
  for (const url of urls) {
    // 固定タブは左端の固定タブの並びの後ろに入るので、順に作れば設定の並びになる
    await chrome.tabs.create({ windowId: win.id, url, pinned: true, active: false });
  }
  return urls.length;
}
