import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsForm } from '../../components/SettingsForm';
import { loadSettings, saveSettings } from '../../core/settings';
import { DEFAULT_SETTINGS, type Settings } from '../../types';

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  return (
    <SettingsForm
      settings={settings}
      onChange={(next) => {
        setSettings(next);
        void saveSettings(next);
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
