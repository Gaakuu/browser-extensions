const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 「3分前」「5時間前」「2日前」の形にする */
export function relativeTime(from: number, now: number): string {
  const diff = Math.max(0, now - from);
  if (diff < MINUTE) return 'たった今';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}分前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}時間前`;
  return `${Math.floor(diff / DAY)}日前`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

/** MV3 の favicon 権限で、ページの favicon を拡張から読む URL */
export function faviconUrl(pageUrl: string): string {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return '';
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}
