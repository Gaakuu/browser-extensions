const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift', 'OS']);

type KeyLike = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

/**
 * 「修飾キーを押したまま開き、離したら確定」（VSCode の Ctrl+Tab）を判定する。
 *
 * ポップアップはショートカットで開いた時点の修飾キーの状態を知らない。そこで、
 * ポップアップの中で押していない修飾キーの keyup が来たら「押したまま開いた」とみなし、
 * すべての修飾キーが離れた時点で確定する。
 * - アイコンをクリックして開いた場合や、ポップアップ内で押した修飾キーは確定に使わない
 * - 検索の文字を打ったら確定しない（disarm）
 */
export class HoldToConfirm {
  private pressedInside = new Set<string>();
  private armed: boolean;

  constructor(armed = true) {
    this.armed = armed;
  }

  disarm(): void {
    this.armed = false;
  }

  keyDown(event: KeyLike): void {
    this.pressedInside.add(event.key);
  }

  /** true を返したら選択中のタブに切り替える */
  keyUp(event: KeyLike): boolean {
    const pressedInside = this.pressedInside.delete(event.key);
    if (!this.armed || pressedInside || !MODIFIER_KEYS.has(event.key)) return false;
    return !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  }
}
