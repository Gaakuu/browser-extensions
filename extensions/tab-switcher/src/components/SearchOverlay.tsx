import { List, Paper, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabInfo } from '../types/messages';
import { fuzzySearchTabs } from '../utils/fuzzyMatch';
import { getMessage } from '../utils/i18n';
import { TabCard } from './TabCard';

interface SearchOverlayProps {
  tabs: TabInfo[];
  onSwitch: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onDismiss: () => void;
}

export function SearchOverlay({ tabs, onSwitch, onClose, onDismiss }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 表示されるたびにリセット
  useEffect(() => {
    setQuery('');
    setFocusIndex(0);
    inputRef.current?.focus();
  }, [tabs]);

  const results = useMemo(() => fuzzySearchTabs(query, tabs), [query, tabs]);

  useEffect(() => {
    setFocusIndex(0);
  }, [query]);

  const confirm = useCallback(() => {
    if (results[focusIndex]) {
      onSwitch(results[focusIndex].tab.id);
    }
  }, [results, focusIndex, onSwitch]);

  useEffect(() => {
    const moveDown = () => setFocusIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    const moveUp = () => setFocusIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
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

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [results.length, confirm, onDismiss]);

  return (
    <Paper
      elevation={8}
      sx={{
        width: 480,
        maxHeight: 400,
        overflow: 'hidden',
        borderRadius: 2,
        mt: '4px',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="search-overlay"
    >
      <TextField
        inputRef={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={getMessage('searchPlaceholder')}
        variant="outlined"
        size="small"
        fullWidth
        sx={{ px: 2, py: 1.5 }}
        slotProps={{ htmlInput: { 'data-testid': 'search-input' } }}
      />
      <List dense sx={{ overflow: 'auto', flex: 1, py: 0.5 }}>
        {results.length > 0 ? (
          results.map((result, index) => (
            <TabCard
              key={result.tab.id}
              tab={result.tab}
              isFocused={index === focusIndex}
              onSelect={() => onSwitch(result.tab.id)}
              onClose={() => onClose(result.tab.id)}
              highlights={result.highlights}
              highlightField={result.highlightField}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {getMessage('noResults')}
          </Typography>
        )}
      </List>
    </Paper>
  );
}
