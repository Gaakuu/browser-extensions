import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TabInfo } from '../types/tabs';
import { TabSwitcherPopup } from './TabSwitcherPopup';

const tabs: TabInfo[] = [
  { id: 1, windowId: 1, index: 0, title: 'Gmail', url: 'https://mail.google.com', favIconUrl: '' },
  { id: 2, windowId: 1, index: 1, title: 'GitHub', url: 'https://github.com', favIconUrl: '' },
  { id: 3, windowId: 1, index: 2, title: '設定', url: 'chrome://settings', favIconUrl: '' },
];

function setup(mode: 'switcher' | 'search' = 'switcher') {
  const props = { onSwitch: vi.fn(), onCloseTab: vi.fn(), onDismiss: vi.fn() };
  render(<TabSwitcherPopup tabs={tabs} mode={mode} {...props} />);
  return props;
}

const selected = () =>
  screen.getAllByRole('button').find((el) => el.classList.contains('Mui-selected'));

describe('TabSwitcherPopup', () => {
  it('切り替えモードでは直前のタブ（2番目）を選んだ状態で開く', () => {
    setup();
    expect(selected()).toHaveTextContent('GitHub');
  });

  it('押したまま開いた修飾キーを離すと、選んでいるタブに切り替える', () => {
    const { onSwitch } = setup();
    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true });
    fireEvent.keyUp(window, { key: 'Control' });
    expect(onSwitch).toHaveBeenCalledWith(3);
  });

  it('検索モードでは修飾キーを離しても切り替えず、先頭を選ぶ', () => {
    const { onSwitch } = setup('search');
    fireEvent.keyUp(window, { key: 'Meta' });
    expect(onSwitch).not.toHaveBeenCalled();
    expect(selected()).toHaveTextContent('Gmail');
  });

  it('文字を打つと絞り込み、Enter で切り替える', () => {
    const { onSwitch } = setup();
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'settings' } });
    expect(screen.queryByText('Gmail')).not.toBeInTheDocument();
    // 打ったあとは修飾キーを離しても確定しない
    fireEvent.keyUp(window, { key: 'Meta' });
    expect(onSwitch).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSwitch).toHaveBeenCalledWith(3);
  });

  it('↑↓ は端で折り返す', () => {
    setup();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(selected()).toHaveTextContent('Gmail');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(selected()).toHaveTextContent('設定');
  });

  it('⌘⌫ で選んでいるタブを閉じ、一覧から消す', () => {
    const { onCloseTab } = setup();
    fireEvent.keyDown(window, { key: 'Backspace', metaKey: true });
    expect(onCloseTab).toHaveBeenCalledWith(2);
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('何も打っていなければ今のウィンドウだけ、打つとほかのウィンドウのタブからも探す', () => {
    const props = { onSwitch: vi.fn(), onCloseTab: vi.fn(), onDismiss: vi.fn() };
    const otherTabs: TabInfo[] = [
      { id: 9, windowId: 2, index: 0, title: 'Jira', url: 'https://jira.example', favIconUrl: '' },
    ];
    render(<TabSwitcherPopup tabs={tabs} otherTabs={otherTabs} mode="search" {...props} />);
    expect(screen.queryByText('Jira')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'jira' } });
    expect(screen.getByText('Jira')).toBeInTheDocument();
    expect(screen.getByTestId('tab-card-9')).toHaveTextContent('otherWindow');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(props.onSwitch).toHaveBeenCalledWith(9);
  });

  it('Esc で閉じる', () => {
    const { onDismiss } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });
});
