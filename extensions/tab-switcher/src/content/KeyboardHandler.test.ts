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

  it('修飾キーを離したときにコールバックが発火する', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    // Cmd+Shift を押す
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: true }));

    expect(callback).not.toHaveBeenCalled();

    // Meta を離す
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('修飾キーを押し続けている間はコールバックが呼ばれない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: true }));
    // Space を押して離す（修飾キーは押し続け）
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', metaKey: true, shiftKey: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', metaKey: true, shiftKey: true }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('Shift を離したときもコールバックが発火する', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: true }));

    // Shift を離す
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('Control キーでも動作する（Windows/Linux）', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, ctrlKey: true }));

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('destroy でイベントリスナーがクリーンアップされる', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);
    handler.destroy();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta', metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, metaKey: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('修飾キーを押さずに離してもコールバックは呼ばれない', () => {
    const callback = vi.fn();
    handler.onModifierRelease(callback);

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }));

    expect(callback).not.toHaveBeenCalled();
  });
});
