import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVE_KEY } from '../core/ArchiveStore';
import { archiveIdleTabs } from './archiveIdleTabs';

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

let storage: Record<string, unknown>;
const query = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  storage = {};
  query.mockReset();
  remove.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (key: string, cb: (r: Record<string, unknown>) => void) => cb({ [key]: storage[key] }),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(storage, items);
          cb();
        },
      },
    },
    tabs: { query, remove },
  });
});

describe('archiveIdleTabs', () => {
  it('古いタブを記録してから閉じる', async () => {
    query.mockResolvedValue([
      { id: 1, url: 'https://old/', title: 'Old', lastAccessed: NOW - 13 * HOUR, groupId: -1 },
      { id: 2, url: 'https://new/', title: 'New', lastAccessed: NOW - HOUR, groupId: -1 },
    ]);

    const count = await archiveIdleTabs(NOW);

    expect(count).toBe(1);
    expect(remove).toHaveBeenCalledWith([1]);
    expect((storage[ARCHIVE_KEY] as { url: string }[]).map((e) => e.url)).toEqual(['https://old/']);
  });

  it('閉じるものが無ければ何もしない', async () => {
    query.mockResolvedValue([{ id: 2, url: 'https://new/', lastAccessed: NOW, groupId: -1 }]);

    expect(await archiveIdleTabs(NOW)).toBe(0);
    expect(remove).not.toHaveBeenCalled();
    expect(storage[ARCHIVE_KEY]).toBeUndefined();
  });
});
