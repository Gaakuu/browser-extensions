export interface MatchRange {
  start: number;
  end: number;
}

export function fuzzyMatch(query: string, target: string): MatchRange[] | null {
  if (query === '') return [];
  if (target === '') return null;

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();
  const indices: number[] = [];

  let targetIndex = 0;
  for (let i = 0; i < lowerQuery.length; i++) {
    const found = lowerTarget.indexOf(lowerQuery[i], targetIndex);
    if (found === -1) return null;
    indices.push(found);
    targetIndex = found + 1;
  }

  // 連続するインデックスをまとめて範囲にする
  const ranges: MatchRange[] = [];
  let rangeStart = indices[0];
  let rangeEnd = indices[0] + 1;

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === rangeEnd) {
      rangeEnd = indices[i] + 1;
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = indices[i];
      rangeEnd = indices[i] + 1;
    }
  }
  ranges.push({ start: rangeStart, end: rangeEnd });

  return ranges;
}
