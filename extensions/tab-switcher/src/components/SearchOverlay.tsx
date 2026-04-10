import { List, Paper, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabInfo } from '../types/messages';
import { type MatchRange, fuzzyMatch } from '../utils/fuzzyMatch';
import { TabCard } from './TabCard';

interface SearchOverlayProps {
  tabs: TabInfo[];
  onSwitch: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onDismiss: () => void;
}

interface SearchResult {
  tab: TabInfo;
  highlights: MatchRange[];
  highlightField: 'title' | 'url';
}

export function SearchOverlay({ tabs, onSwitch, onClose, onDismiss }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results: SearchResult[] = useMemo(() => {
    if (query === '') {
      return tabs.map((tab) => ({ tab, highlights: [], highlightField: 'title' as const }));
    }

    const matched: SearchResult[] = [];
    for (const tab of tabs) {
      const titleMatch = fuzzyMatch(query, tab.title);
      if (titleMatch) {
        matched.push({ tab, highlights: titleMatch, highlightField: 'title' });
        continue;
      }
      const urlMatch = fuzzyMatch(query, tab.url);
      if (urlMatch) {
        matched.push({ tab, highlights: urlMatch, highlightField: 'url' });
      }
    }
    return matched;
  }, [query, tabs]);

  useEffect(() => {
    setFocusIndex(0);
  }, [query]);

  const confirm = useCallback(() => {
    if (results[focusIndex]) {
      onSwitch(results[focusIndex].tab.id);
    }
  }, [results, focusIndex, onSwitch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
          break;
        case 'Enter':
          e.preventDefault();
          confirm();
          break;
        case 'Escape':
          e.preventDefault();
          onDismiss();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results.length, confirm, onDismiss]);

  return (
    <Paper
      elevation={8}
      sx={{
        width: 480,
        maxHeight: 400,
        overflow: 'hidden',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="search-overlay"
    >
      <TextField
        inputRef={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="タブを検索..."
        variant="outlined"
        size="small"
        fullWidth
        sx={{ p: 1 }}
        slotProps={{ htmlInput: { 'data-testid': 'search-input' } }}
      />
      <List dense disablePadding sx={{ overflow: 'auto', flex: 1 }}>
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
            該当なし
          </Typography>
        )}
      </List>
    </Paper>
  );
}
