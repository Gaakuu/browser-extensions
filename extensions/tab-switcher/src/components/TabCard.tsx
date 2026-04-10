import CloseIcon from '@mui/icons-material/Close';
import { Avatar, IconButton, ListItemAvatar, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { HighlightRange } from '../types/messages';
import type { TabInfo } from '../types/messages';
import type { MatchRange } from '../utils/fuzzyMatch';
import { getMessage } from '../utils/i18n';

interface TabCardProps {
  tab: TabInfo;
  isFocused: boolean;
  onSelect: () => void;
  onClose: () => void;
  highlights?: MatchRange[];
  highlightField?: 'title' | 'url';
}

function highlightText(text: string, ranges?: MatchRange[]): React.ReactNode {
  if (!ranges || ranges.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const range of ranges) {
    if (range.start > lastEnd) {
      parts.push(text.slice(lastEnd, range.start));
    }
    parts.push(
      <mark key={range.start} style={{ background: '#a8c7fa', color: '#1f1f1f', borderRadius: 2 }}>
        {text.slice(range.start, range.end)}
      </mark>,
    );
    lastEnd = range.end;
  }
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
}

export function TabCard({ tab, isFocused, onSelect, onClose, highlights, highlightField }: TabCardProps) {
  const titleHighlights = highlightField === 'title' ? highlights : undefined;
  const urlHighlights = highlightField === 'url' ? highlights : undefined;

  return (
    <ListItemButton
      selected={isFocused}
      onClick={onSelect}
      sx={{ py: 0.5 }}
      data-testid={`tab-card-${tab.id}`}
    >
      <ListItemAvatar sx={{ minWidth: 36 }}>
        <Avatar src={tab.favIconUrl} sx={{ width: 20, height: 20 }} alt="" />
      </ListItemAvatar>
      <ListItemText
        sx={{ overflow: 'hidden', mr: 1 }}
        primary={
          <Typography variant="body2" noWrap>
            {highlightText(tab.title, titleHighlights)}
          </Typography>
        }
        secondary={
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            component="div"
            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {highlightText(tab.url, urlHighlights)}
          </Typography>
        }
      />
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={getMessage('closeTab', [tab.title])}
        data-testid={`close-tab-${tab.id}`}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </ListItemButton>
  );
}
