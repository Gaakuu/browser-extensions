import { describe, expect, it } from 'vitest';
import { isPinnableUrl, pinnedUrlsOf, urlsToPin } from './alwaysPinned';

const tab = (overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab =>
  ({
    id: 1,
    windowId: 1,
    index: 0,
    pinned: false,
    active: false,
    url: 'https://example.com/',
    ...overrides,
  }) as chrome.tabs.Tab;

describe('isPinnableUrl', () => {
  it('ふつうのページと chrome:// の設定ページは覚えられる', () => {
    expect(isPinnableUrl('https://mail.google.com/mail/u/0/#inbox')).toBe(true);
    expect(isPinnableUrl('chrome://settings/')).toBe(true);
  });

  it('新しいタブ・空のページは覚えない', () => {
    expect(isPinnableUrl('chrome://newtab/')).toBe(false);
    expect(isPinnableUrl('about:blank')).toBe(false);
    expect(isPinnableUrl('')).toBe(false);
    expect(isPinnableUrl(undefined)).toBe(false);
  });
});

describe('pinnedUrlsOf', () => {
  it('固定タブだけを左から順に、重なりなく取り出す', () => {
    const tabs = [
      tab({ index: 3, url: 'https://not-pinned/' }),
      tab({ index: 1, pinned: true, url: 'https://calendar/' }),
      tab({ index: 0, pinned: true, url: 'https://mail/' }),
      tab({ index: 2, pinned: true, url: 'https://mail/' }),
      tab({ index: 4, pinned: true, url: '', pendingUrl: 'https://loading/' }),
      tab({ index: 5, pinned: true, url: 'chrome://newtab/' }),
    ];
    expect(pinnedUrlsOf(tabs)).toEqual(['https://mail/', 'https://calendar/', 'https://loading/']);
  });
});

describe('urlsToPin', () => {
  const urls = ['https://mail/', 'https://calendar/'];

  it('固定タブの無い新しいウィンドウには全部開く', () => {
    expect(urlsToPin(urls, [tab({ url: 'chrome://newtab/' })])).toEqual(urls);
    expect(urlsToPin(urls, [])).toEqual(urls);
  });

  it('固定タブがもうあるウィンドウ（起動し直したときの復元など）には足さない', () => {
    expect(urlsToPin(urls, [tab({ pinned: true, url: 'https://mail/#inbox' })])).toEqual([]);
  });
});
