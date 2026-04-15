import { Fzf } from 'fzf';
import type { TabInfo } from '../types/messages';

export interface MatchRange {
  start: number;
  end: number;
}

export interface FuzzyMatchResult {
  tab: TabInfo;
  highlights: MatchRange[];
  highlightField: 'title' | 'url';
  score: number;
}

function positionsToRanges(positions: Set<number>): MatchRange[] {
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const ranges: MatchRange[] = [];
  let start = sorted[0];
  let end = sorted[0] + 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end) {
      end = sorted[i] + 1;
    } else {
      ranges.push({ start, end });
      start = sorted[i];
      end = sorted[i] + 1;
    }
  }
  ranges.push({ start, end });
  return ranges;
}

export function fuzzySearchTabs(query: string, tabs: TabInfo[]): FuzzyMatchResult[] {
  if (query === '') {
    return tabs.map((tab) => ({ tab, highlights: [], highlightField: 'title' as const, score: 0 }));
  }

  // タイトルで検索
  const titleFzf = new Fzf(tabs, { selector: (tab) => tab.title });
  const titleResults = titleFzf.find(query);

  // URLで検索（クエリパラメータを除外）
  const stripQuery = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  };
  const urlFzf = new Fzf(tabs, { selector: (tab) => stripQuery(tab.url) });
  const urlResults = urlFzf.find(query);

  // スコア閾値: 散らばったマッチを除外
  const MIN_SCORE = 20;

  // タイトルマッチを優先し、タイトルにマッチしなかったものだけURLマッチを使う
  const matchedIds = new Set<number>();
  const results: FuzzyMatchResult[] = [];

  for (const result of titleResults) {
    if (result.score < MIN_SCORE) continue;
    matchedIds.add(result.item.id);
    results.push({
      tab: result.item,
      highlights: positionsToRanges(result.positions),
      highlightField: 'title',
      score: result.score,
    });
  }

  for (const result of urlResults) {
    if (result.score < MIN_SCORE) continue;
    if (!matchedIds.has(result.item.id)) {
      matchedIds.add(result.item.id);
      results.push({
        tab: result.item,
        highlights: positionsToRanges(result.positions),
        highlightField: 'url',
        score: result.score,
      });
    }
  }

  return results;
}

// 後方互換: 単純なファジーマッチ（テスト用）
export function fuzzyMatch(query: string, target: string): MatchRange[] | null {
  if (query === '') return [];
  if (target === '') return null;

  const fzf = new Fzf([target]);
  const results = fzf.find(query);

  if (results.length === 0) return null;
  return positionsToRanges(results[0].positions);
}
