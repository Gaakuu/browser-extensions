import { describe, expect, it } from 'vitest';
import {
  countFolders,
  countLinks,
  parseArcSidebar,
  toBookmarkBar,
  toNetscapeHtml,
} from './convert.ts';

const tab = (id: string, url: string, savedTitle: string, title: string | null = null) => [
  id,
  {
    id,
    title,
    createdAt: 700000000,
    childrenIds: [],
    data: { tab: { savedURL: url, savedTitle } },
  },
];

const folder = (id: string, title: string, childrenIds: string[]) => [
  id,
  { id, title, childrenIds, data: { list: {} } },
];

const container = (id: string, childrenIds: string[]) => [
  id,
  { id, title: null, childrenIds, data: { itemContainer: {} } },
];

/** Arc の形を真似た最小のサンプル */
const fixture = {
  sidebar: {
    containers: [
      { global: {} },
      {
        topAppsContainerIDs: [{ default: true }, 'top'],
        spaces: [
          'space-work',
          {
            id: 'space-work',
            title: 'Work',
            containerIDs: ['pinned', 'work-pinned', 'unpinned', 'work-unpinned'],
          },
          'space-dev',
          {
            id: 'space-dev',
            title: 'Development',
            containerIDs: ['pinned', 'dev-pinned', 'unpinned', 'dev-unpinned'],
          },
        ],
        items: [
          ...container('top', ['fav-mail', 'fav-cal']),
          ...tab('fav-mail', 'https://mail.example.com/', 'Mail'),
          ...tab('fav-cal', 'https://calendar.example.com/', 'Calendar'),
          ...container('work-pinned', ['w-1', 'w-folder']),
          ...tab('w-1', 'https://docs.example.com/a', 'Doc A', '名前を変えた'),
          ...folder('w-folder', '読みもの', ['w-2', 'w-arc']),
          ...tab('w-2', 'https://zenn.example.com/b', 'Article <B> & "C"'),
          ...tab('w-arc', 'arc://extensions', 'Arc internal'),
          ...container('work-unpinned', ['w-open']),
          ...tab('w-open', 'https://example.com/today', 'Today'),
          ...container('dev-pinned', ['d-split']),
          // 分割表示の入れ物（list でも tab でもない）は中身を同じ階層に並べる
          ...[
            'd-split',
            { id: 'd-split', title: null, childrenIds: ['d-1', 'd-2'], data: { splitView: {} } },
          ],
          ...tab('d-1', 'https://github.com/org/repo', 'repo'),
          ...tab('d-2', 'http://localhost:3000/', 'local'),
          ...container('dev-unpinned', []),
        ],
      },
    ],
  },
};

describe('parseArcSidebar', () => {
  const exp = parseArcSidebar(fixture);

  it('Favorites を順番どおりに取り出す', () => {
    expect(exp.favorites.map((n) => n.title)).toEqual(['Mail', 'Calendar']);
  });

  it('Space ごとにピン留めのフォルダ構造を保つ', () => {
    expect(exp.spaces.map((s) => s.title)).toEqual(['Work', 'Development']);
    const work = exp.spaces[0];
    expect(countLinks(work.pinned)).toBe(2);
    expect(countFolders(work.pinned)).toBe(1);
    expect(work.pinned[1]).toMatchObject({ type: 'folder', title: '読みもの' });
  });

  it('ピン留めの名前を変えていれば、その名前を使う', () => {
    expect(exp.spaces[0].pinned[0]).toMatchObject({ title: '名前を変えた' });
  });

  it('http(s) 以外の URL は除いて数える', () => {
    expect(exp.skipped).toBe(1);
  });

  it('分割表示の中のタブを平らに並べる', () => {
    expect(exp.spaces[1].pinned.map((n) => n.title)).toEqual(['repo', 'local']);
  });

  it('Arc の日時（2001 年起点）を Unix 秒に直す', () => {
    expect(exp.favorites[0]).toMatchObject({ addDate: 700000000 + 978307200 });
  });

  it('形が違うファイルではエラーにする', () => {
    expect(() => parseArcSidebar({})).toThrow();
  });
});

describe('toBookmarkBar', () => {
  const exp = parseArcSidebar(fixture);

  it('既定ではピン留めしていないタブを入れない', () => {
    const bar = toBookmarkBar(exp);
    expect(bar.map((n) => n.title)).toEqual(['Mail', 'Calendar', 'Work', 'Development']);
    expect(countLinks(bar)).toBe(6);
  });

  it('includeUnpinned のときは「開いていたタブ」フォルダに入れる', () => {
    const bar = toBookmarkBar(exp, { includeUnpinned: true });
    const work = bar.find((n) => n.title === 'Work');
    expect(work?.type === 'folder' && work.children.at(-1)).toMatchObject({
      type: 'folder',
      title: '開いていたタブ',
    });
  });
});

describe('toNetscapeHtml', () => {
  const html = toNetscapeHtml(parseArcSidebar(fixture));

  it('Chrome が読める Netscape 形式の見出しを持つ', () => {
    expect(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true);
    expect(html).toContain('PERSONAL_TOOLBAR_FOLDER="true"');
  });

  it('タイトルと URL をエスケープする', () => {
    expect(html).toContain('Article &lt;B&gt; &amp; &quot;C&quot;');
    expect(html).not.toContain('<B>');
  });

  it('フォルダを入れ子の DL で書く', () => {
    expect(html).toMatch(/<DT><H3>Work<\/H3>\n\s+<DL><p>/);
  });
});
