import type { Settings } from '../types';

const HOUR_MS = 60 * 60 * 1000;

/** 閉じてよいページか。拡張や chrome:// のページ、新しいタブには触れない */
export function isArchivableUrl(url: string | undefined): boolean {
  return !!url && /^(https?|file):\/\//i.test(url);
}

/**
 * Arc の自動アーカイブと同じ考え方で、閉じるタブを選ぶ。
 * ピン留め・表示中・音が出ている・グループ内（設定で切り替え）のタブは閉じない。
 */
export function selectTabsToArchive(
  tabs: chrome.tabs.Tab[],
  settings: Settings,
  now: number,
): chrome.tabs.Tab[] {
  if (settings.thresholdHours <= 0) return [];
  const threshold = settings.thresholdHours * HOUR_MS;

  return tabs.filter((tab) => {
    if (tab.id == null) return false;
    if (tab.pinned || tab.active || tab.audible) return false;
    if (!settings.archiveGroupedTabs && tab.groupId != null && tab.groupId !== -1) return false;
    if (!isArchivableUrl(tab.url)) return false;
    if (typeof tab.lastAccessed !== 'number') return false;
    return now - tab.lastAccessed >= threshold;
  });
}
