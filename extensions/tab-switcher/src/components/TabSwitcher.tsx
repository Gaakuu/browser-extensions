import { List, Paper } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import type { TabInfo } from '../types/messages';
import { TabCard } from './TabCard';

export interface TabSwitcherHandle {
  moveFocusDown: () => void;
  moveFocusUp: () => void;
  confirmSelection: () => void;
}

interface TabSwitcherProps {
  tabs: TabInfo[];
  onSwitch: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onDismiss: () => void;
  onReady?: (handle: TabSwitcherHandle) => void;
}

export function TabSwitcher({ tabs, onSwitch, onClose, onDismiss, onReady }: TabSwitcherProps) {
  const [focusIndex, setFocusIndex] = useState(0);

  const moveDown = useCallback(() => {
    setFocusIndex((prev) => (prev + 1) % tabs.length);
  }, [tabs.length]);

  const moveUp = useCallback(() => {
    setFocusIndex((prev) => (prev - 1 + tabs.length) % tabs.length);
  }, [tabs.length]);

  const confirm = useCallback(() => {
    if (tabs[focusIndex]) {
      onSwitch(tabs[focusIndex].id);
    }
  }, [tabs, focusIndex, onSwitch]);

  const handleClose = useCallback(
    (tabId: number) => {
      const closingIndex = tabs.findIndex((t) => t.id === tabId);
      onClose(tabId);

      // フォーカス調整
      if (tabs.length <= 1) return;
      if (closingIndex <= focusIndex && focusIndex > 0) {
        setFocusIndex((prev) => prev - 1);
      }
    },
    [tabs, focusIndex, onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ' || (e.ctrlKey && e.key === 'n')) {
        e.preventDefault();
        moveDown();
      } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        moveUp();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveDown, moveUp, confirm, onDismiss]);

  // 外部からの操作ハンドルを公開
  useEffect(() => {
    onReady?.({
      moveFocusDown: moveDown,
      moveFocusUp: moveUp,
      confirmSelection: confirm,
    });
  }, [onReady, moveDown, moveUp, confirm]);

  // focusIndex が範囲外にならないよう補正
  useEffect(() => {
    if (focusIndex >= tabs.length && tabs.length > 0) {
      setFocusIndex(tabs.length - 1);
    }
  }, [tabs.length, focusIndex]);

  return (
    <Paper
      elevation={8}
      sx={{
        width: 480,
        maxHeight: 400,
        overflow: 'auto',
        borderRadius: 2,
      }}
      data-testid="tab-switcher"
    >
      <List dense sx={{ py: 0.5 }}>
        {tabs.map((tab, index) => (
          <TabCard
            key={tab.id}
            tab={tab}
            isFocused={index === focusIndex}
            onSelect={() => onSwitch(tab.id)}
            onClose={() => handleClose(tab.id)}
          />
        ))}
      </List>
    </Paper>
  );
}
