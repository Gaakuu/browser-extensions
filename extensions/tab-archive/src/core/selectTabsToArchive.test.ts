import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { isArchivableUrl, selectTabsToArchive } from './selectTabsToArchive';

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const tab = (overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab =>
  ({
    id: 1,
    windowId: 1,
    index: 0,
    pinned: false,
    active: false,
    audible: false,
    groupId: -1,
    url: 'https://example.com/',
    title: 'Example',
    lastAccessed: NOW - 25 * HOUR,
    ...overrides,
  }) as chrome.tabs.Tab;

describe('selectTabsToArchive', () => {
  it('既定では 18 時間以上見ていないタブを選ぶ', () => {
    const tabs = [tab({ id: 1 }), tab({ id: 2, lastAccessed: NOW - 17 * HOUR })];
    expect(selectTabsToArchive(tabs, DEFAULT_SETTINGS, NOW).map((t) => t.id)).toEqual([1]);
  });

  it('ちょうどしきい値のタブも選ぶ', () => {
    const tabs = [tab({ lastAccessed: NOW - 18 * HOUR })];
    expect(selectTabsToArchive(tabs, DEFAULT_SETTINGS, NOW)).toHaveLength(1);
  });

  it('ピン留め・表示中・音が出ているタブは閉じない', () => {
    const tabs = [
      tab({ id: 1, pinned: true }),
      tab({ id: 2, active: true }),
      tab({ id: 3, audible: true }),
    ];
    expect(selectTabsToArchive(tabs, DEFAULT_SETTINGS, NOW)).toEqual([]);
  });

  it('既定ではグループ内のタブを閉じない。設定でオンにすると閉じる', () => {
    const tabs = [tab({ groupId: 5 })];
    expect(selectTabsToArchive(tabs, DEFAULT_SETTINGS, NOW)).toEqual([]);
    expect(
      selectTabsToArchive(tabs, { ...DEFAULT_SETTINGS, archiveGroupedTabs: true }, NOW),
    ).toHaveLength(1);
  });

  it('chrome:// や新しいタブには触れない', () => {
    const tabs = [tab({ url: 'chrome://settings/' }), tab({ url: 'chrome://newtab/' })];
    expect(selectTabsToArchive(tabs, DEFAULT_SETTINGS, NOW)).toEqual([]);
  });

  it('lastAccessed が無いタブは閉じない', () => {
    expect(selectTabsToArchive([tab({ lastAccessed: undefined })], DEFAULT_SETTINGS, NOW)).toEqual(
      [],
    );
  });

  it('時間が 0 なら何も閉じない', () => {
    expect(selectTabsToArchive([tab({})], { ...DEFAULT_SETTINGS, thresholdHours: 0 }, NOW)).toEqual(
      [],
    );
  });
});

describe('isArchivableUrl', () => {
  it.each([
    ['https://a.example/', true],
    ['http://localhost:3000/', true],
    ['file:///tmp/a.html', true],
    ['chrome://extensions/', false],
    ['chrome-extension://abc/popup.html', false],
    ['', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isArchivableUrl(url)).toBe(expected);
  });
});
