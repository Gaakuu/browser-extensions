import { describe, expect, it } from 'vitest';
import { fuzzyMatch, fuzzySearchTabs } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  it('基本的なマッチ', () => {
    const result = fuzzyMatch('gml', 'Gmail');
    expect(result).not.toBeNull();
  });

  it('大文字小文字を区別しない', () => {
    const result = fuzzyMatch('gmail', 'Gmail');
    expect(result).not.toBeNull();
  });

  it('マッチしない場合はnullを返す', () => {
    const result = fuzzyMatch('xyz', 'Gmail');
    expect(result).toBeNull();
  });

  it('ハイライト範囲を返す', () => {
    const result = fuzzyMatch('gml', 'Gmail');
    expect(result).not.toBeNull();
    expect(result?.length).toBeGreaterThan(0);
  });

  it('空文字の検索は空の結果を返す', () => {
    const result = fuzzyMatch('', 'Gmail');
    expect(result).toEqual([]);
  });

  it('空文字の対象はnullを返す', () => {
    const result = fuzzyMatch('a', '');
    expect(result).toBeNull();
  });

  it('特殊文字でエラーにならない', () => {
    expect(() => fuzzyMatch('(', 'test(123)')).not.toThrow();
  });

  it('URLに対してマッチする', () => {
    const result = fuzzyMatch('github', 'https://github.com');
    expect(result).not.toBeNull();
  });
});

describe('fuzzySearchTabs', () => {
  const sampleTabs = [
    {
      id: 1,
      title: 'Gmail - Inbox',
      url: 'https://mail.google.com',
      favIconUrl: '',
      lastAccessed: 1,
    },
    {
      id: 2,
      title: 'GitHub - Pull Requests',
      url: 'https://github.com/pulls',
      favIconUrl: '',
      lastAccessed: 2,
    },
    {
      id: 3,
      title: 'Google Search',
      url: 'https://www.google.com/search?q=test',
      favIconUrl: '',
      lastAccessed: 3,
    },
  ];

  it('空クエリは全タブを返す', () => {
    const results = fuzzySearchTabs('', sampleTabs);
    expect(results).toHaveLength(3);
  });

  it('タイトルでマッチする', () => {
    const results = fuzzySearchTabs('gmail', sampleTabs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tab.id).toBe(1);
    expect(results[0].highlightField).toBe('title');
  });

  it('マッチしないクエリは空配列を返す', () => {
    const results = fuzzySearchTabs('zzzzz', sampleTabs);
    expect(results).toHaveLength(0);
  });

  it('連続マッチが優先される（search → /search にマッチ、散らばらない）', () => {
    const results = fuzzySearchTabs('search', sampleTabs);
    const googleSearch = results.find((r) => r.tab.id === 3);
    expect(googleSearch).toBeDefined();
    // Google Search のタイトルにマッチするはず
    expect(googleSearch?.highlightField).toBe('title');
  });

  it('ハイライト範囲が返される', () => {
    const results = fuzzySearchTabs('git', sampleTabs);
    const github = results.find((r) => r.tab.id === 2);
    expect(github).toBeDefined();
    expect(github?.highlights.length).toBeGreaterThan(0);
  });
});
