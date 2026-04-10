import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  it('基本的なマッチ', () => {
    const result = fuzzyMatch('gml', 'Gmail');
    expect(result).not.toBeNull();
  });

  it('大文字小文字を区別しない', () => {
    const result = fuzzyMatch('GMAIL', 'gmail');
    expect(result).not.toBeNull();
  });

  it('マッチしない場合はnullを返す', () => {
    const result = fuzzyMatch('xyz', 'Gmail');
    expect(result).toBeNull();
  });

  it('ハイライト範囲を正しく返す', () => {
    const result = fuzzyMatch('gml', 'Gmail');
    expect(result).not.toBeNull();
    // G, m が連続 → {0,2}、l は位置4 → {4,5}
    expect(result).toContainEqual({ start: 0, end: 2 });
    expect(result).toContainEqual({ start: 4, end: 5 });
  });

  it('連続する文字はまとめたハイライト範囲になる', () => {
    const result = fuzzyMatch('gma', 'Gmail');
    expect(result).not.toBeNull();
    // G, m, a が連続 → 1つの範囲
    expect(result).toContainEqual({ start: 0, end: 3 });
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
    const result = fuzzyMatch('(', 'test(123)');
    expect(result).not.toBeNull();
  });

  it('URLに対してマッチする', () => {
    const result = fuzzyMatch('git', 'https://github.com');
    expect(result).not.toBeNull();
  });

  it('順序通りにマッチする', () => {
    // 'ba' は 'abc' にマッチしない（b→aは逆順）
    const result = fuzzyMatch('ba', 'abc');
    expect(result).toBeNull();
  });
});
