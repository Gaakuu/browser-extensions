import { describe, expect, it } from 'vitest';
import type { TabInfo } from '../types/tabs';
import { forgetTab, MRU_LIMIT, recordActivation, replaceTab, sortByMru } from './mru';

const tab = (id: number, index: number, lastAccessed?: number): TabInfo => ({
  id,
  windowId: 1,
  index,
  title: `Tab ${id}`,
  url: `https://example.com/${id}`,
  favIconUrl: '',
  lastAccessed,
});

describe('recordActivation', () => {
  it('アクティブになったタブを先頭に移す', () => {
    expect(recordActivation([1, 2, 3], 3)).toEqual([3, 1, 2]);
    expect(recordActivation([1, 2, 3], 9)).toEqual([9, 1, 2, 3]);
  });

  it('上限を超えたら古いものから捨てる', () => {
    const order = Array.from({ length: MRU_LIMIT }, (_, i) => i);
    const next = recordActivation(order, -1);
    expect(next).toHaveLength(MRU_LIMIT);
    expect(next[0]).toBe(-1);
    expect(next).not.toContain(MRU_LIMIT - 1);
  });
});

describe('forgetTab / replaceTab', () => {
  it('閉じたタブを消す', () => {
    expect(forgetTab([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('差し替わったタブの ID を置き換え、順番は保つ', () => {
    expect(replaceTab([1, 2, 3], 20, 2)).toEqual([1, 20, 3]);
  });
});

describe('sortByMru', () => {
  it('表示中のタブを先頭、続いて拡張が見たアクティブ化の順に並べる', () => {
    const tabs = [tab(1, 0), tab(2, 1), tab(3, 2)];
    expect(sortByMru(tabs, [2, 3, 1], 1).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('まだ見ていないタブは lastAccessed の新しい順で後ろに並べる', () => {
    // 4 は裏で開いたばかり（lastAccessed は新しい）でも、使ったタブより前に出さない
    const tabs = [tab(1, 0, 100), tab(2, 1, 200), tab(3, 2, 50), tab(4, 3, 999)];
    expect(sortByMru(tabs, [2, 1], 2).map((t) => t.id)).toEqual([2, 1, 4, 3]);
  });

  it('順番の記録が無い（読み込み直後など）ときは lastAccessed で並べる', () => {
    const tabs = [tab(1, 0, 100), tab(2, 1, 300), tab(3, 2, 200)];
    expect(sortByMru(tabs, [], 1).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('lastAccessed が無いタブはウィンドウ内の並び順', () => {
    const tabs = [tab(3, 2), tab(1, 0), tab(2, 1)];
    expect(sortByMru(tabs, []).map((t) => t.id)).toEqual([1, 2, 3]);
  });
});
