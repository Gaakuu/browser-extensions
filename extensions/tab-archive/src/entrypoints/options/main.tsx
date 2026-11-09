import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsForm } from '../../components/SettingsForm';
import { pinnedUrlsOf } from '../../core/alwaysPinned';
import { loadSettings, saveSettings } from '../../core/settings';
import { DEFAULT_SETTINGS, type Settings } from '../../types';

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (next: Settings) => {
    setSettings(next);
    void saveSettings(next);
  };

  return (
    <SettingsForm
      settings={settings}
      onChange={update}
      onCapturePinned={async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true, pinned: true });
        update({ ...settings, alwaysPinnedUrls: pinnedUrlsOf(tabs) });
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
