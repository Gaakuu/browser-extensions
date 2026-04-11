import type { ScreenshotSettings } from '../types/messages';

const STORAGE_KEY = 'screenshotSettings';

export const DEFAULT_SETTINGS: ScreenshotSettings = {
  autoCopyToClipboard: true,
  filenamePrefix: 'screenshot',
};

export async function loadSettings(): Promise<ScreenshotSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}

export async function saveSettings(settings: Partial<ScreenshotSettings>): Promise<ScreenshotSettings> {
  const current = await loadSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  return updated;
}
