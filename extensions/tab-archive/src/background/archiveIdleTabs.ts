import { addToArchive, toArchivedTab } from '../core/ArchiveStore';
import { selectTabsToArchive } from '../core/selectTabsToArchive';
import { loadSettings } from '../core/settings';

/** 見ていないタブを選んで記録し、閉じる。閉じた件数を返す */
export async function archiveIdleTabs(now = Date.now()): Promise<number> {
  const settings = await loadSettings();
  const tabs = await chrome.tabs.query({});
  const targets = selectTabsToArchive(tabs, settings, now);
  if (targets.length === 0) return 0;

  // 記録してから閉じる（閉じたあとで記録に失敗すると、タブが消えるだけになる）
  await addToArchive(targets.map((tab) => toArchivedTab(tab, now)));
  await chrome.tabs.remove(targets.map((tab) => tab.id as number));
  return targets.length;
}
