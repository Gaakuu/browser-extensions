import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CropFreeIcon from '@mui/icons-material/CropFree';
import SettingsIcon from '@mui/icons-material/Settings';

interface ToolbarProps {
  position: 'top' | 'bottom';
  onFullPage: () => void;
  onVisibleArea: () => void;
  onSettings: () => void;
}

export function Toolbar({ position, onFullPage, onVisibleArea, onSettings }: ToolbarProps) {
  const positionStyle = position === 'top'
    ? { top: 16, bottom: 'auto' as const }
    : { bottom: 16, top: 'auto' as const };

  return (
    <Paper
      data-testid="toolbar"
      elevation={8}
      sx={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        ...positionStyle,
        zIndex: 2147483647,
        display: 'flex',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: 2,
        pointerEvents: 'auto',
      }}
    >
      <Tooltip title="全画面">
        <IconButton aria-label="全画面" onClick={onFullPage} size="small">
          <FullscreenIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="表示領域">
        <IconButton aria-label="表示領域" onClick={onVisibleArea} size="small">
          <CropFreeIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="設定">
        <IconButton aria-label="設定" onClick={onSettings} size="small">
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
