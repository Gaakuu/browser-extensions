/**
 * 固定タブの tabId → slot（登録した URL）の表。
 * Service Worker は 30 秒ほどで止まるので storage.session に置く（Chrome を閉じると消え、
 * 起動し直したあとは assignSlots が URL とホストで当て直す）。
 */
const SLOT_MAP_KEY = 'pinnedSlotMap';

export async function loadSlotMap(): Promise<Record<string, string>> {
  const result = await chrome.storage.session.get(SLOT_MAP_KEY);
  return (result[SLOT_MAP_KEY] as Record<string, string> | undefined) ?? {};
}

export async function updateSlotMap(
  change: (map: Record<string, string>) => Record<string, string>,
): Promise<void> {
  const next = change({ ...(await loadSlotMap()) });
  await chrome.storage.session.set({ [SLOT_MAP_KEY]: next });
}

export function setSlots(entries: [number, string][]) {
  return updateSlotMap((map) => {
    for (const [tabId, slot] of entries) map[String(tabId)] = slot;
    return map;
  });
}

export function deleteSlots(tabIds: number[]) {
  return updateSlotMap((map) => {
    for (const id of tabIds) delete map[String(id)];
    return map;
  });
}
