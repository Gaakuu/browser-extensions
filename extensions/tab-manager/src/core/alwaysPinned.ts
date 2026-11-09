/** 固定タブとして覚えておける URL か。新しいタブのページは開き直しても意味がないので除く */
export function isPinnableUrl(url: string | undefined): url is string {
  if (!url) return false;
  return !/^(chrome:\/\/newtab|chrome-search:\/\/|about:blank)/i.test(url);
}

/** ウィンドウの固定タブの URL を、左から順に重なりなく取り出す */
export function pinnedUrlsOf(tabs: chrome.tabs.Tab[]): string[] {
  const urls = [...tabs]
    .filter((tab) => tab.pinned)
    .sort((a, b) => a.index - b.index)
    .map((tab) => tab.url || tab.pendingUrl)
    .filter(isPinnableUrl);
  return [...new Set(urls)];
}

/**
 * 新しいウィンドウに開く固定タブの URL を返す。
 * 固定タブがもう1つでもあるウィンドウには足さない。Chrome を起動し直したときは
 * 前回の固定タブが戻ってくるので、そこに足すと同じタブが二重になる。
 * 固定タブを別ウィンドウに引き出したときも同じ扱いになる。
 */
export function urlsToPin(alwaysPinnedUrls: string[], tabsInWindow: chrome.tabs.Tab[]): string[] {
  if (tabsInWindow.some((tab) => tab.pinned)) return [];
  return alwaysPinnedUrls;
}
