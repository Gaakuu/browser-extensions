import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const AUTO_CLOSE_MS = 5000;

interface PreviewProps {
  imageUrl: string;
  clipboardStatus: 'success' | 'error' | null;
  onSave: () => void;
  onClose: () => void;
}

export function Preview({ imageUrl, clipboardStatus, onSave, onClose }: PreviewProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // フェードアウト後に閉じる
    }, AUTO_CLOSE_MS);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Paper
      data-testid="preview"
      elevation={12}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 2147483647,
        width: 320,
        borderRadius: 3,
        overflow: 'hidden',
        pointerEvents: 'auto',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* サムネイル */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 180,
          cursor: 'pointer',
        }}
        onClick={onSave}
      >
        <img
          data-testid="preview-image"
          src={imageUrl}
          alt="Screenshot preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* フッター */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          gap: 8,
        }}
      >
        {/* ステータス */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {clipboardStatus === 'success' ? (
            <>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              <Typography variant="caption" sx={{ color: '#aaa' }}>
                コピー済み
              </Typography>
            </>
          ) : clipboardStatus === 'error' ? (
            <>
              <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />
              <Typography variant="caption" sx={{ color: '#aaa' }}>
                コピー失敗
              </Typography>
            </>
          ) : null}
        </div>

        {/* アクション */}
        <IconButton size="small" onClick={onSave} title="保存">
          <SaveIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose} title="閉じる">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </Paper>
  );
}
