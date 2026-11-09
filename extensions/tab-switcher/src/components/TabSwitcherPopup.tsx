import { Box, List, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HoldToConfirm } from '../core/holdToConfirm';
import type { PopupMode, TabInfo } from '../types/tabs';
import { fuzzySearchTabs } from '../utils/fuzzyMatch';
import { getMessage } from '../utils/i18n';
import { TabCard } from './TabCard';

interface TabSwitcherPopupProps {
  /** 最近使った順。先頭は表示中のタブ */
  tabs: TabInfo[];
  /** ほかのウィンドウのタブ（最近使った順）。文字を打ったときだけ検索に入れる */
  otherTabs?: TabInfo[];
  mode: PopupMode;
  onSwitch: (tabId: number) => void;
  onCloseTab: (tabId: number) => void;
  onDismiss: () => void;
}

const POPUP_WIDTH = 480;
/** otherTabs を渡さないときの既定。毎回新しい配列を作ると、下の useEffect が回り続ける */
const NO_TABS: TabInfo[] = [];
const LIST_MAX_HEIGHT = 440;

function isMoveDown(e: KeyboardEvent): boolean {
  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) return true;
  if (e.ctrlKey && e.key === 'n') return true;
  // ショートカット（例: ⌘⇧Space）を押したまま Space をもう一度押したとき
  return e.key === ' ' && (e.metaKey || e.ctrlKey || e.altKey);
}

function isMoveUp(e: KeyboardEvent): boolean {
  return e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) || (e.ctrlKey && e.key === 'p');
}

export function TabSwitcherPopup({
  tabs: initialTabs,
  otherTabs: initialOtherTabs = NO_TABS,
  mode,
  onSwitch,
  onCloseTab,
  onDismiss,
}: TabSwitcherPopupProps) {
  const [tabs, setTabs] = useState(initialTabs);
  const [otherTabs, setOtherTabs] = useState(initialOtherTabs);
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(mode === 'switcher' && initialTabs.length > 1 ? 1 : 0);
  const holdRef = useRef(new HoldToConfirm(mode === 'switcher'));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setTabs(initialTabs), [initialTabs]);
  useEffect(() => setOtherTabs(initialOtherTabs), [initialOtherTabs]);

  // 何も打っていなければ今のウィンドウだけ。打ったら、ほかのウィンドウのタブからも探す
  const results = useMemo(
    () => fuzzySearchTabs(query, query === '' ? tabs : [...tabs, ...otherTabs]),
    [query, tabs, otherTabs],
  );
  const otherIds = useMemo(() => new Set(otherTabs.map((t) => t.id)), [otherTabs]);
  const focused = results[Math.min(focusIndex, results.length - 1)]?.tab;

  // 最新の値をキーボードのハンドラから参照する
  const stateRef = useRef({ results, focused, onSwitch, onDismiss });
  stateRef.current = { results, focused, onSwitch, onDismiss };

  const closeTab = (tabId: number) => {
    onCloseTab(tabId);
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setOtherTabs((prev) => prev.filter((t) => t.id !== tabId));
  };
  const closeTabRef = useRef(closeTab);
  closeTabRef.current = closeTab;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const move = (delta: number) => {
      const count = stateRef.current.results.length;
      if (count === 0) return;
      setFocusIndex((prev) => (Math.min(prev, count - 1) + delta + count) % count);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      holdRef.current.keyDown(e);
      const { focused, onSwitch, onDismiss } = stateRef.current;
      if (isMoveDown(e)) {
        e.preventDefault();
        move(1);
      } else if (isMoveUp(e)) {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focused) onSwitch(focused.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (focused) closeTabRef.current(focused.id);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (holdRef.current.keyUp(e)) {
        const { focused, onSwitch } = stateRef.current;
        if (focused) onSwitch(focused.id);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, []);

  // 選択中の行が見切れたらスクロール
  useEffect(() => {
    const item = listRef.current?.children[focusIndex] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [focusIndex]);

  return (
    <Box sx={{ width: POPUP_WIDTH, display: 'flex', flexDirection: 'column' }} data-testid="tab-switcher-popup">
      <TextField
        inputRef={inputRef}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setFocusIndex(0);
          if (next !== '') holdRef.current.disarm();
        }}
        placeholder={getMessage('searchPlaceholder')}
        variant="outlined"
        size="small"
        fullWidth
        autoComplete="off"
        sx={{ px: 1.5, pt: 1.5, pb: 1 }}
        slotProps={{ htmlInput: { 'data-testid': 'search-input', spellCheck: false } }}
      />
      <List ref={listRef} dense sx={{ py: 0, overflow: 'auto', maxHeight: LIST_MAX_HEIGHT }}>
        {results.map((result) => (
          <TabCard
            key={result.tab.id}
            tab={result.tab}
            isFocused={result.tab.id === focused?.id}
            inOtherWindow={otherIds.has(result.tab.id)}
            onSelect={() => onSwitch(result.tab.id)}
            onClose={() => closeTab(result.tab.id)}
            highlights={result.highlights}
            highlightField={result.highlightField}
          />
        ))}
      </List>
      {results.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          {getMessage('noResults')}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}
      >
        {getMessage('popupHint')}
      </Typography>
    </Box>
  );
}
