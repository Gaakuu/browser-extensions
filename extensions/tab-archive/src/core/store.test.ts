import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import {
  ARCHIVE_KEY,
  ARCHIVE_LIMIT,
  addToArchive,
  loadArchive,
  removeFromArchive,
  toArchivedTab,
} from './ArchiveStore';
import { escapeOmniboxText, searchArchive } from './searchArchive';
import { loadSettings, normalizeSettings, SETTINGS_KEY } from './settings';

let storage: Record<string, unknown>;

beforeEach(() => {
  storage = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (key: string, cb: (r: Record<string, unknown>) => void) => cb({ [key]: storage[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(storage, items);
          cb();
        },
      },
    },
  });
});

const entry = (id: string, url: string, title = id) => ({
  id,
  url,
  title,
  archivedAt: 0,
  lastAccessed: 0,
});

describe('ArchiveStore', () => {
  it('新しいものを先頭に足し、同じ URL の古い記録を消す', async () => {
    await addToArchive([entry('a', 'https://a/'), entry('b', 'https://b/')]);
    await addToArchive([entry('a2', 'https://a/')]);
    expect((await loadArchive()).map((e) => e.id)).toEqual(['a2', 'b']);
  });

  it('上限を超えたら古いものから消す', async () => {
    storage[ARCHIVE_KEY] = Array.from({ length: ARCHIVE_LIMIT }, (_, i) =>
      entry(`old${i}`, `https://old/${i}`),
    );
    const next = await addToArchive([entry('new', 'https://new/')]);
    expect(next).toHaveLength(ARCHIVE_LIMIT);
    expect(next[0].id).toBe('new');
    expect(next.at(-1)?.id).toBe(`old${ARCHIVE_LIMIT - 2}`);
  });

  it('ID を指定して消す', async () => {
    await addToArchive([entry('a', 'https://a/'), entry('b', 'https://b/')]);
    expect((await removeFromArchive('a')).map((e) => e.id)).toEqual(['b']);
  });

  it('タブから記録を作る', () => {
    const tab = { id: 7, url: 'https://x/', title: '', lastAccessed: 5 } as chrome.tabs.Tab;
    expect(toArchivedTab(tab, 10)).toEqual({
      id: '10-7',
      url: 'https://x/',
      title: 'https://x/',
      archivedAt: 10,
      lastAccessed: 5,
    });
  });
});

describe('searchArchive', () => {
  const entries = [
    entry('1', 'https://github.com/org/repo/pull/1', 'Fix login'),
    entry('2', 'https://zenn.dev/article', 'React の記事'),
  ];

  it('空なら全件', () => {
    expect(searchArchive(entries, '  ')).toHaveLength(2);
  });

  it('語をすべて含むものだけ（大文字小文字を区別しない）', () => {
    expect(searchArchive(entries, 'GITHUB login').map((e) => e.id)).toEqual(['1']);
    expect(searchArchive(entries, 'github react')).toEqual([]);
  });

  it('omnibox 用にエスケープする', () => {
    expect(escapeOmniboxText(`<a & "b" 'c'>`)).toBe('&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;');
  });
});

describe('settings', () => {
  it('保存が無ければ既定値', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('壊れた値は既定値で埋める', async () => {
    storage[SETTINGS_KEY] = { thresholdHours: -1, archiveGroupedTabs: 'yes' };
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('正しい値はそのまま使う', () => {
    expect(
      normalizeSettings({
        thresholdHours: 12,
        archiveGroupedTabs: true,
        alwaysPinnedUrls: ['https://mail.google.com/', 'https://calendar.google.com/'],
      }),
    ).toEqual({
      thresholdHours: 12,
      archiveGroupedTabs: true,
      alwaysPinnedUrls: ['https://mail.google.com/', 'https://calendar.google.com/'],
    });
  });

  it('既定は 18 時間で、常に出す固定タブは無し', () => {
    expect(DEFAULT_SETTINGS.thresholdHours).toBe(18);
    expect(DEFAULT_SETTINGS.alwaysPinnedUrls).toEqual([]);
  });

  it('常に出す固定タブの URL は、文字列でないものと重なりを落とす', () => {
    expect(
      normalizeSettings({ alwaysPinnedUrls: ['https://a/', 1, '', 'https://a/', 'https://b/'] })
        .alwaysPinnedUrls,
    ).toEqual(['https://a/', 'https://b/']);
    expect(normalizeSettings({ alwaysPinnedUrls: 'https://a/' }).alwaysPinnedUrls).toEqual([]);
  });
});
