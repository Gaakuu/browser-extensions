import { getStorageItem, setStorageItem } from '@browser-extensions/shared';
import type { ArchivedTab } from '../types';

export const ARCHIVE_KEY = 'archive';
/** 残す件数の上限。古いものから消す */
export const ARCHIVE_LIMIT = 1000;

export async function loadArchive(): Promise<ArchivedTab[]> {
  return getStorageItem<ArchivedTab[]>(ARCHIVE_KEY, []);
}

/** 新しいものを先頭に足す。同じ URL の古い記録は消して1件にする */
export async function addToArchive(entries: ArchivedTab[]): Promise<ArchivedTab[]> {
  if (entries.length === 0) return loadArchive();
  const current = await loadArchive();
  const urls = new Set(entries.map((e) => e.url));
  const next = [...entries, ...current.filter((e) => !urls.has(e.url))].slice(0, ARCHIVE_LIMIT);
  await setStorageItem(ARCHIVE_KEY, next);
  return next;
}

export async function removeFromArchive(id: string): Promise<ArchivedTab[]> {
  const next = (await loadArchive()).filter((e) => e.id !== id);
  await setStorageItem(ARCHIVE_KEY, next);
  return next;
}

export function toArchivedTab(tab: chrome.tabs.Tab, now: number): ArchivedTab {
  return {
    id: `${now}-${tab.id}`,
    url: tab.url ?? '',
    title: tab.title || tab.url || '',
    archivedAt: now,
    lastAccessed: tab.lastAccessed ?? now,
  };
}
