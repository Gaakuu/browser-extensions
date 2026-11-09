import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TabSwitcherPopup } from '../../components/TabSwitcherPopup';
import { takePendingMode } from '../../core/MruStore';
import { getOtherWindowTabsByMru, getWindowTabsByMru, switchToTab } from '../../core/windowTabs';

async function main() {
  const current = await chrome.windows.getCurrent();
  const currentWindowId = current.id as number;
  const [tabs, otherTabs, pendingMode] = await Promise.all([
    getWindowTabsByMru(currentWindowId),
    getOtherWindowTabsByMru(currentWindowId),
    takePendingMode(),
  ]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <TabSwitcherPopup
          tabs={tabs}
          otherTabs={otherTabs}
          mode={pendingMode ?? 'switcher'}
          onSwitch={async (tabId) => {
            await switchToTab(tabId, currentWindowId);
            window.close();
          }}
          onCloseTab={(tabId) => {
            void chrome.tabs.remove(tabId);
          }}
          onDismiss={() => window.close()}
        />
      </ThemeProvider>
    </StrictMode>,
  );
}

void main();
