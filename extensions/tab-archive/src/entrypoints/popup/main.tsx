import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArchivePopup } from '../../components/ArchivePopup';
import { loadArchive, removeFromArchive } from '../../core/ArchiveStore';
import type { ArchivedTab, BackgroundMessage } from '../../types';

function App() {
  const [entries, setEntries] = useState<ArchivedTab[]>([]);
  const [lastArchivedCount, setLastArchivedCount] = useState<number | null>(null);

  useEffect(() => {
    loadArchive().then(setEntries);
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
