import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './copyText';

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('execCommand("copy") が通れば、それで済ませて textarea を片付ける', async () => {
    let copied: string | undefined;
    document.execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value;
      return true;
    });

    await expect(copyText('https://example.com/')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(copied).toBe('https://example.com/');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('execCommand が false なら navigator.clipboard に回す', async () => {
    document.execCommand = vi.fn(() => false);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await expect(copyText('https://example.com/')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.com/');
  });

  it('どちらも失敗したら false', async () => {
    document.execCommand = vi.fn(() => {
      throw new Error('denied');
    });
    const writeText = vi.fn(async () => {
      throw new Error('not focused');
    });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await expect(copyText('https://example.com/')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
