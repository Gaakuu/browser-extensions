import type { CopyResult } from '../core/copyActiveTabUrl';
import { showToast } from '../core/showToast';

const BADGE_MS = 1500;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

const BADGE: Record<CopyResult, { text: string; color: string }> = {
  copied: { text: '✓', color: '#2e7d32' },
  'no-url': { text: '!', color: '#c62828' },
  failed: { text: '!', color: '#c62828' },
};

const TOAST: Record<CopyResult, string> = {
  copied: 'URL をコピーしました',
  'no-url': 'このタブの URL を読めませんでした',
  failed: 'URL をコピーできませんでした',
};

async function flashBadge(result: CopyResult): Promise<void> {
  const { text, color } = BADGE[result];
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    void chrome.action.setBadgeText({ text: '' });
  }, BADGE_MS);
}

/**
 * ツールバーのアイコンにバッジを一瞬出し、ふつうのページなら下に小さくトーストを出す。
 * chrome:// ・新しいタブ・ウェブストアには注入できないので、そこではバッジだけになる。
 */
export async function notify(result: CopyResult, tab: chrome.tabs.Tab | undefined): Promise<void> {
  await flashBadge(result);
  if (tab?.id === undefined) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // chrome-types の func は引数なしの型。args で message を渡す
      func: showToast as () => void,
      args: [TOAST[result]],
    });
  } catch {
    // 注入できないページ。バッジだけで知らせる
  }
}
