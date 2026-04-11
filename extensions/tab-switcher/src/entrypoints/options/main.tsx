import { CssBaseline, ThemeProvider, darkTheme } from '@browser-extensions/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShortcutGuide } from '../../components/ShortcutGuide';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ShortcutGuide />
    </ThemeProvider>
  </StrictMode>,
);
