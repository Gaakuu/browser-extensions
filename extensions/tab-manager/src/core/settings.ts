import { getStorageItem, setStorageItem } from '@browser-extensions/shared';
import { DEFAULT_SETTINGS, type Settings } from '../types';

export const SETTINGS_KEY = 'settings';

/** 保存されている値が欠けていたり壊れていたりしても既定値で埋める */
export function normalizeSettings(raw: unknown): Settings {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Settings>;
  const hours = Number(value.thresholdHours);
  const resetMinutes = Number(value.resetPinnedAfterMinutes);
  return {
    thresholdHours: Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_SETTINGS.thresholdHours,
    archiveGroupedTabs:
      typeof value.archiveGroupedTabs === 'boolean'
        ? value.archiveGroupedTabs
        : DEFAULT_SETTINGS.archiveGroupedTabs,
    alwaysPinnedUrls: Array.isArray(value.alwaysPinnedUrls)
      ? [
          ...new Set(
            value.alwaysPinnedUrls.filter((u): u is string => typeof u === 'string' && u !== ''),
          ),
        ]
      : DEFAULT_SETTINGS.alwaysPinnedUrls,
    syncPinnedTabs:
      typeof value.syncPinnedTabs === 'boolean'
        ? value.syncPinnedTabs
        : DEFAULT_SETTINGS.syncPinnedTabs,
    resetPinnedAfterMinutes:
      Number.isFinite(resetMinutes) && resetMinutes >= 0
        ? resetMinutes
        : DEFAULT_SETTINGS.resetPinnedAfterMinutes,
  };
}

export async function loadSettings(): Promise<Settings> {
  return normalizeSettings(await getStorageItem<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setStorageItem(SETTINGS_KEY, normalizeSettings(settings));
}
