import { describe, expect, it } from 'vitest';
import { HoldToConfirm } from './holdToConfirm';

const key = (
  key: string,
  mods: Partial<Record<'meta' | 'ctrl' | 'alt' | 'shift', boolean>> = {},
) => ({
  key,
  metaKey: !!mods.meta,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
});

describe('HoldToConfirm', () => {
  it('開く前から押していた修飾キーをすべて離したら確定する（⌘⇧Space）', () => {
    const hold = new HoldToConfirm();
    expect(hold.keyUp(key('Meta', { shift: true }))).toBe(false);
    expect(hold.keyUp(key('Shift'))).toBe(true);
  });

  it('押したまま Tab で選び直してから離しても確定する', () => {
    const hold = new HoldToConfirm();
    hold.keyDown(key('Tab', { ctrl: true }));
    hold.keyUp(key('Tab', { ctrl: true }));
    expect(hold.keyUp(key('Control'))).toBe(true);
  });

  it('ポップアップの中で押した修飾キーでは確定しない', () => {
    const hold = new HoldToConfirm();
    hold.keyDown(key('Shift', { shift: true }));
    expect(hold.keyUp(key('Shift'))).toBe(false);
  });

  it('検索の文字を打ったあとは確定しない', () => {
    const hold = new HoldToConfirm();
    hold.disarm();
    expect(hold.keyUp(key('Meta'))).toBe(false);
  });

  it('検索モードで開いたときは確定しない', () => {
    const hold = new HoldToConfirm(false);
    expect(hold.keyUp(key('Meta'))).toBe(false);
  });

  it('修飾キー以外の keyup では確定しない', () => {
    const hold = new HoldToConfirm();
    expect(hold.keyUp(key('a'))).toBe(false);
  });
});
