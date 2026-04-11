import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface PreviewProps {
  imageUrl: string;
  clipboardStatus: 'success' | 'error' | null;
  onSave: () => void;
  onClose: () => void;
}

export function Preview({ imageUrl, clipboardStatus, onSave, onClose }: PreviewProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (clipboardStatus) {
      setSnackbarOpen(true);
    }
  }, [clipboardStatus]);

  return (
    <Paper
      data-testid="preview"
      elevation={12}
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2147483647,
        maxWidth: '80vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          overflow: 'auto',
          maxHeight: 'calc(80vh - 56px)',
        }}
      >
        <img
          data-testid="preview-image"
          src={imageUrl}
          alt="Screenshot preview"
          style={{
            display: 'block',
            maxWidth: '100%',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          justifyContent: 'flex-end',
        }}
      >
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          size="small"
        >
          保存
        </Button>
        <Button
          variant="outlined"
          startIcon={<CloseIcon />}
          onClick={onClose}
          size="small"
        >
          閉じる
        </Button>
      </div>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={clipboardStatus === 'success' ? 'success' : 'error'}
          onClose={() => setSnackbarOpen(false)}
          data-testid="clipboard-toast"
        >
          {clipboardStatus === 'success'
            ? 'クリップボードにコピーしました'
            : 'クリップボードへのコピーに失敗しました'}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
