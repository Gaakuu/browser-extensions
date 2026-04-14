import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
    },
  },
});

const STORAGE_KEY = 'screenshotSettings';

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  describe('loadSettings', () => {
    it('未保存ならデフォルト設定を返す', async () => {
      mockGet.mockResolvedValue({});

      const settings = await loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(mockGet).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('部分的に保存された値はデフォルトとマージされる', async () => {
      mockGet.mockResolvedValue({
        [STORAGE_KEY]: { autoCopyToClipboard: false },
      });

      const settings = await loadSettings();

      expect(settings.autoCopyToClipboard).toBe(false);
      expect(settings.filenamePrefix).toBe(DEFAULT_SETTINGS.filenamePrefix);
    });

    it('全項目が保存されていれば保存値を返す', async () => {
      mockGet.mockResolvedValue({
        [STORAGE_KEY]: {
          autoCopyToClipboard: false,
          filenamePrefix: 'custom',
        },
      });

      const settings = await loadSettings();

      expect(settings).toEqual({
        autoCopyToClipboard: false,
        filenamePrefix: 'custom',
      });
    });
  });

  describe('saveSettings', () => {
    it('部分更新を既存値とマージして保存する', async () => {
      mockGet.mockResolvedValue({
        [STORAGE_KEY]: {
          autoCopyToClipboard: true,
          filenamePrefix: 'old',
        },
      });

      const result = await saveSettings({ filenamePrefix: 'new' });

      expect(mockSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: {
          autoCopyToClipboard: true,
          filenamePrefix: 'new',
        },
      });
      expect(result).toEqual({
        autoCopyToClipboard: true,
        filenamePrefix: 'new',
      });
    });

    it('未保存状態からの部分更新もデフォルトにマージされる', async () => {
      mockGet.mockResolvedValue({});

      const result = await saveSettings({ autoCopyToClipboard: false });

      expect(mockSet).toHaveBeenCalledWith({
        [STORAGE_KEY]: {
          autoCopyToClipboard: false,
          filenamePrefix: DEFAULT_SETTINGS.filenamePrefix,
        },
      });
      expect(result.autoCopyToClipboard).toBe(false);
      expect(result.filenamePrefix).toBe(DEFAULT_SETTINGS.filenamePrefix);
    });

    it('空オブジェクトを渡すと既存値（または DEFAULT）を保存する', async () => {
      mockGet.mockResolvedValue({
        [STORAGE_KEY]: { autoCopyToClipboard: false, filenamePrefix: 'p' },
      });

      const result = await saveSettings({});

      expect(result).toEqual({ autoCopyToClipboard: false, filenamePrefix: 'p' });
    });
  });
});
