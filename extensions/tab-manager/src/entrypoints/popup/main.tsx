import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArchivePopup } from '../../components/ArchivePopup';
import { loadArchive, removeFromArchive } from '../../core/ArchiveStore';
import { loadSettings, saveSettings } from '../../core/settings';
import type { ArchivedTab, BackgroundMessage } from '../../types';

function App() {
  const [entries, setEntries] = useState<ArchivedTab[]>([]);
  const [lastArchivedCount, setLastArchivedCount] = useState<number | null>(null);
  const [syncPinned, setSyncPinned] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadArchive().then(setEntries);
    loadSettings().then((s) => setSyncPinned(s.syncPinnedTabs));
  }, []);

  return (
    <ArchivePopup
      entries={entries}
      now={Date.now()}
      lastArchivedCount={lastArchivedCount}
      onOpen={async (entry) => {
        await removeFromArchive(entry.id);
        await chrome.tabs.create({ url: entry.url });
        window.close();
      }}
      onRemove={async (entry) => setEntries(await removeFromArchive(entry.id))}
      onArchiveNow={async () => {
        const message: BackgroundMessage = { type: 'ARCHIVE_NOW' };
        const response = (await chrome.runtime.sendMessage(message)) as { count: number };
        setLastArchivedCount(response?.count ?? 0);
        setEntries(await loadArchive());
      }}
      onOpenSettings={() => chrome.runtime.openOptionsPage()}
      syncPinned={syncPinned}
      onToggleSyncPinned={async (next) => {
        setSyncPinned(next);
        await saveSettings({ ...(await loadSettings()), syncPinnedTabs: next });
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
