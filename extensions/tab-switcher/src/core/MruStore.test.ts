import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStorageMock } from '../test/chromeMock';
import { loadOrder, MruStore, setPendingMode, takePendingMode } from './MruStore';

const storage = createSessionStorageMock();

beforeEach(() => {
  storage.reset();
  vi.stubGlobal('chrome', { storage: { session: storage.session } });
});

describe('MruStore', () => {
  it('続けて来たアクティブ化を取りこぼさず順に記録する', async () => {
    await Promise.all([MruStore.activated(1), MruStore.activated(2), MruStore.activated(3)]);
    expect(await loadOrder()).toEqual([3, 2, 1]);
  });

  it('閉じたタブと差し替わったタブを反映する', async () => {
    await MruStore.activated(1);
    await MruStore.activated(2);
    await MruStore.activated(3);
    await MruStore.removed(2);
    await MruStore.replaced(10, 1);
    expect(await loadOrder()).toEqual([3, 10]);
  });

  it('壊れた値が入っていても空として扱う', async () => {
    await chrome.storage.session.set({ mruOrder: 'broken' });
    expect(await loadOrder()).toEqual([]);
  });
});

describe('pending mode', () => {
  it('1回だけ読める', async () => {
    await setPendingMode('search', 1000);
    expect(await takePendingMode(1500)).toBe('search');
    expect(await takePendingMode(1600)).toBeNull();
  });

  it('古いものは捨てる（ポップアップが開けなかったときの残り）', async () => {
    await setPendingMode('search', 1000);
    expect(await takePendingMode(10_000)).toBeNull();
  });
});
