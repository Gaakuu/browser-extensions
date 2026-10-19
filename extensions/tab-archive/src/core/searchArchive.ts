import type { ArchivedTab } from '../types';

/**
 * 空白で区切った語がすべてタイトルか URL に含まれるものを返す（大文字・小文字は区別しない）。
 * 並びは元の順（新しい順）のまま。
 */
export function searchArchive(entries: ArchivedTab[], query: string): ArchivedTab[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return entries;
  return entries.filter((entry) => {
    const haystack = `${entry.title}\n${entry.url}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** omnibox の説明文は XML として解釈されるのでエスケープする */
export function escapeOmniboxText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
