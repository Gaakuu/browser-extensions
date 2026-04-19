const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Shift']);

export class KeyboardHandler {
  private callback: (() => void) | null = null;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyUp = (e: KeyboardEvent) => {
      if (!MODIFIER_KEYS.has(e.key)) return;
      // keyup イベントの metaKey/ctrlKey/shiftKey は離された後の押下状態を表す
      const allReleased = !e.metaKey && !e.ctrlKey && !e.shiftKey;
      if (allReleased && this.callback) {
        this.callback();
      }
    };

    window.addEventListener('keyup', this.handleKeyUp, true);
  }

  onModifierRelease(callback: () => void): void {
    this.callback = callback;
  }

  destroy(): void {
    window.removeEventListener('keyup', this.handleKeyUp, true);
    this.callback = null;
  }
}
