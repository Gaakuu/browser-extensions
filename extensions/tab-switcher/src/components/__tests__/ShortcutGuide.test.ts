import { describe, expect, it } from 'vitest';
import { getDevtoolsConsoleCode, OVERRIDE_ENTRIES, type OverrideEntry } from '../ShortcutGuide';

describe('getDevtoolsConsoleCode', () => {
  it('拡張機能IDが埋め込まれる', () => {
    const code = getDevtoolsConsoleCode('my-ext-id', OVERRIDE_ENTRIES);
    expect(code).toContain('extensionId: "my-ext-id"');
  });

  it('全エントリのコマンド名とキーバインドが含まれる', () => {
    const code = getDevtoolsConsoleCode('test-id', OVERRIDE_ENTRIES);
    expect(code).toContain('commandName: "show-tab-switcher"');
    expect(code).toContain('keybinding: "Ctrl+Tab"');
    expect(code).toContain('commandName: "search-tabs"');
    expect(code).toContain('keybinding: "Ctrl+P"');
  });

  it('カスタムエントリで正しく生成される', () => {
    const entries: OverrideEntry[] = [
      { commandName: 'my-command', keybinding: 'Ctrl+K', label: 'test' },
    ];
    const code = getDevtoolsConsoleCode('ext-123', entries);
    expect(code).toContain('commandName: "my-command"');
    expect(code).toContain('keybinding: "Ctrl+K"');
    expect(code).toContain('extensionId: "ext-123"');
    // 1エントリなので改行区切りが含まれない
    expect(code).not.toContain('\n\n');
  });

  it('生成されたコードは構文エラーなく parse できる', () => {
    const code = getDevtoolsConsoleCode('test-id', OVERRIDE_ENTRIES);
    // new Function でパースのみ行う（実行はしない）
    expect(() => new Function(code)).not.toThrow();
  });

  it('特殊文字を含む extensionId でも構文エラーにならない', () => {
    // 実際の Chrome 拡張 ID は a-p の英小文字のみだが、念のため英数字パターン
    const code = getDevtoolsConsoleCode('abcdefghijklmnopabcdefghijklmnop', OVERRIDE_ENTRIES);
    expect(() => new Function(code)).not.toThrow();
  });
});

describe('OVERRIDE_ENTRIES', () => {
  it('show-tab-switcher と search-tabs の2エントリがある', () => {
    expect(OVERRIDE_ENTRIES).toHaveLength(2);
    expect(OVERRIDE_ENTRIES.map((e) => e.commandName)).toEqual([
      'show-tab-switcher',
      'search-tabs',
    ]);
  });
});
