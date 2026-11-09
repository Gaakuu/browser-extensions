import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { searchArchive } from '../core/searchArchive';
import type { ArchivedTab } from '../types';
import { getMessage } from '../utils/i18n';
import { faviconUrl, hostOf, relativeTime } from '../utils/format';

export interface ArchivePopupProps {
  entries: ArchivedTab[];
  now: number;
  /** タブで開き直す（記録からは消す） */
  onOpen: (entry: ArchivedTab) => void;
  onRemove: (entry: ArchivedTab) => void;
  onArchiveNow: () => void;
  onOpenSettings: () => void;
  /** 直前の「今すぐ整理」で閉じた件数 */
  lastArchivedCount?: number | null;
  /** 固定タブをウィンドウ間でそろえているか。undefined なら切り替えを出さない */
  syncPinned?: boolean;
  onToggleSyncPinned?: (next: boolean) => void;
}

/** 表示する件数の上限（検索すれば全件から探せる） */
const VISIBLE_LIMIT = 200;

export function ArchivePopup({
  entries,
  now,
  onOpen,
  onRemove,
  onArchiveNow,
  onOpenSettings,
  lastArchivedCount,
  syncPinned,
  onToggleSyncPinned,
}: ArchivePopupProps) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchArchive(entries, query), [entries, query]);

  return (
    <Box sx={{ width: 420, p: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder={getMessage('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) onOpen(matches[0]);
          }}
        />
        <Tooltip title={getMessage('openSettings')}>
          <IconButton aria-label={getMessage('openSettings')} onClick={onOpenSettings}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {matches.length === 0 ? (
        <Typography sx={{ py: 3, textAlign: 'center' }} color="text.secondary">
          {getMessage(entries.length === 0 ? 'emptyArchive' : 'noResults')}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {matches.slice(0, VISIBLE_LIMIT).map((entry) => (
            <ListItem
              key={entry.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={getMessage('removeEntry')}
                  onClick={() => onRemove(entry)}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => onOpen(entry)} sx={{ borderRadius: 1, pr: 5 }}>
                <Box
                  component="img"
                  src={faviconUrl(entry.url)}
                  alt=""
                  sx={{ width: 16, height: 16, mr: 1.5, flexShrink: 0 }}
                />
                <ListItemText
                  primary={entry.title}
                  secondary={`${hostOf(entry.url)} · ${relativeTime(entry.archivedAt, now)}`}
                  slotProps={{
                    primary: { noWrap: true },
                    secondary: { noWrap: true },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {lastArchivedCount != null
            ? getMessage('archivedNow', String(lastArchivedCount))
            : getMessage('archiveCount', String(entries.length))}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {syncPinned !== undefined && (
            <Tooltip title={getMessage('syncPinnedHelp')}>
              <Stack direction="row" sx={{ alignItems: 'center' }}>
                <Switch
                  size="small"
                  checked={syncPinned}
                  onChange={(e) => onToggleSyncPinned?.(e.target.checked)}
                  slotProps={{ input: { 'aria-label': getMessage('syncPinnedShort') } }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getMessage('syncPinnedShort')}
                </Typography>
              </Stack>
            </Tooltip>
          )}
          <Button size="small" onClick={onArchiveNow}>
            {getMessage('archiveNow')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
