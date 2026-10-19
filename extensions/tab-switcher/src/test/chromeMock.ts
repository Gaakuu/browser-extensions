import { vi } from 'vitest';

/** chrome.storage.session だけを持つ最小のモック。テストごとに作り直す */
export function createSessionStorageMock() {
  let data: Record<string, unknown> = {};
  return {
    get data() {
      return data;
    },
    reset() {
      data = {};
    },
    session: {
      get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
      set: vi.fn(async (items: Record<string, unknown>) => {
        data = { ...data, ...items };
      }),
      remove: vi.fn(async (key: string) => {
        const { [key]: _removed, ...rest } = data;
        data = rest;
      }),
    },
  };
}
