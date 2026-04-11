import { useState } from 'react';
import Popover from '@mui/material/Popover';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import type { ScreenshotSettings } from '../types/messages';

interface SettingsPopoverProps {
  anchorEl: HTMLElement | null;
  settings: ScreenshotSettings;
  onClose: () => void;
  onChange: (settings: Partial<ScreenshotSettings>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function SettingsPopover({ anchorEl, settings, onClose, onChange, onMouseEnter, onMouseLeave }: SettingsPopoverProps) {
  const [prefix, setPrefix] = useState(settings.filenamePrefix);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: -12, horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      disablePortal
      sx={{ zIndex: 2147483647 }}
      slotProps={{
        paper: {
          onMouseEnter,
          onMouseLeave,
          sx: {
            p: 2,
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            pointerEvents: 'auto',
          },
        },
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        設定
      </Typography>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={settings.autoCopyToClipboard}
            onChange={(_, checked) => onChange({ autoCopyToClipboard: checked })}
          />
        }
        label={<Typography variant="body2">撮影時に自動コピー</Typography>}
      />

      <TextField
        label="ファイル名プレフィックス"
        size="small"
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        onBlur={() => onChange({ filenamePrefix: prefix || 'screenshot' })}
        helperText={`${prefix || 'screenshot'}_2026-04-11_12-00-00.png`}
        slotProps={{
          htmlInput: { style: { fontSize: 13 } },
          formHelperText: { style: { fontSize: 11 } },
        }}
      />

      <Link
        href="#"
        variant="body2"
        underline="hover"
        onClick={(e) => {
          e.preventDefault();
          chrome.runtime.sendMessage({ type: 'OPEN_SHORTCUTS' });
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <KeyboardIcon sx={{ fontSize: 16 }} />
        ショートカットキーを変更
      </Link>
    </Popover>
  );
}
