import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardHandler } from './KeyboardHandler';

describe('KeyboardHandler', () => {
  let handler: KeyboardHandler;

  beforeEach(() => {
    handler = new KeyboardHandler();
  });

  afterEach(() => {
    handler.destroy();
  });

  it('Ctrl のみ押下状態から Ctrl を離すとコールバックが発火する（Ctrl+Tab 想定）', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // Ctrl リリース後の状態: 全修飾キー false
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('Cmd のみ押下状態から Cmd を離すとコールバックが発火する', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('Cmd+Shift 押下中に Shift を先に離してもコールバックは発火しない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // Shift リリース時点で Cmd はまだ押されている
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', metaKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('Cmd+Shift 押下中に Shift → Cmd の順で離すと Cmd リリース時に1回だけ発火する', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // 1. Shift を離す（Cmd まだ押下中）
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', metaKey: true }));
    expect(callback).not.toHaveBeenCalled();

    // 2. Cmd を離す（全解放）
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));
    expect(callback).toHaveBeenCalledOnce();
  });

  it('Ctrl+Shift 押下中に Ctrl を先に離してもコールバックは発火しない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // Ctrl リリース時点で Shift はまだ押されている
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', shiftKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('Ctrl+Cmd 押下中に Ctrl を先に離してもコールバックは発火しない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', metaKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('非修飾キー(Space)のリリースではコールバックは呼ばれない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // Cmd+Shift+Space 押下中に Space だけ離す
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', metaKey: true, shiftKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('Tab のリリースではコールバックは呼ばれない（Ctrl+Tab 押下中）', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', ctrlKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('destroy でイベントリスナーがクリーンアップされる', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);
    handler.destroy();

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(callback).not.toHaveBeenCalled();
  });
});
