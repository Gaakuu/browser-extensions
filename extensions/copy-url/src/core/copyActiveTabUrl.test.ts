import { describe, expect, it, vi } from 'vitest';
import { type CopyActiveTabUrlDeps, copyActiveTabUrl, urlOf } from './copyActiveTabUrl';

function makeDeps(
  tab: Partial<chrome.tabs.Tab> | undefined,
  writeText: CopyActiveTabUrlDeps['writeText'] = async () => true,
) {
  return {
    getActiveTab: vi.fn(async () => tab as chrome.tabs.Tab | undefined),
    writeText: vi.fn(writeText),
    notify: vi.fn(async () => {}),
  };
}

describe('urlOf', () => {
  it('url を優先し、空なら pendingUrl を使う', () => {
    expect(urlOf({ url: 'https://a.example/' } as chrome.tabs.Tab)).toBe('https://a.example/');
    expect(urlOf({ url: '', pendingUrl: 'https://b.example/' } as chrome.tabs.Tab)).toBe(
      'https://b.example/',
    );
    expect(urlOf(undefined)).toBeUndefined();
  });
});

describe('copyActiveTabUrl', () => {
  it('今のタブの URL を書いて copied を知らせる', async () => {
    const tab = { id: 1, url: 'https://example.com/path?q=1#h' };
    const deps = makeDeps(tab);

    await expect(copyActiveTabUrl(deps)).resolves.toBe('copied');
    expect(deps.writeText).toHaveBeenCalledWith('https://example.com/path?q=1#h');
    expect(deps.notify).toHaveBeenCalledWith('copied', tab);
  });

  it('chrome:// のページでも URL をそのまま書く', async () => {
    const deps = makeDeps({ id: 2, url: 'chrome://extensions/shortcuts' });

    await expect(copyActiveTabUrl(deps)).resolves.toBe('copied');
    expect(deps.writeText).toHaveBeenCalledWith('chrome://extensions/shortcuts');
  });

  it('URL が読めなければ書かずに no-url を知らせる', async () => {
    const deps = makeDeps({ id: 3, url: '' });

    await expect(copyActiveTabUrl(deps)).resolves.toBe('no-url');
    expect(deps.writeText).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith('no-url', expect.objectContaining({ id: 3 }));
  });

  it('タブが無ければ no-url', async () => {
    const deps = makeDeps(undefined);

    await expect(copyActiveTabUrl(deps)).resolves.toBe('no-url');
    expect(deps.notify).toHaveBeenCalledWith('no-url', undefined);
  });

  it('書けなかったら failed を知らせる（false でも例外でも）', async () => {
    const rejected = makeDeps({ id: 4, url: 'https://x.example/' }, async () => {
      throw new Error('no offscreen');
    });
    await expect(copyActiveTabUrl(rejected)).resolves.toBe('failed');
    expect(rejected.notify).toHaveBeenCalledWith('failed', expect.anything());

    const refused = makeDeps({ id: 5, url: 'https://x.example/' }, async () => false);
    await expect(copyActiveTabUrl(refused)).resolves.toBe('failed');
  });
});
