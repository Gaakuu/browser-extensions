const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Shift']);

export class KeyboardHandler {
  private modifiersPressed = new Set<string>();
  private callback: (() => void) | null = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(e.key)) {
        this.modifiersPressed.add(e.key);
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(e.key) && this.modifiersPressed.size > 0) {
        const wasModifierHeld = this.modifiersPressed.has('Meta') || this.modifiersPressed.has('Control');
        this.modifiersPressed.delete(e.key);

        if (wasModifierHeld && this.callback) {
          this.callback();
        }
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  onModifierRelease(callback: () => void): void {
    this.callback = callback;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.callback = null;
    this.modifiersPressed.clear();
  }
}
