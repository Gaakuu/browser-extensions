import { CssBaseline, darkTheme, ThemeProvider } from '@browser-extensions/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TabSwitcherPopup } from '../../components/TabSwitcherPopup';
import { takePendingMode } from '../../core/MruStore';
import { getWindowTabsByMru } from '../../core/windowTabs';

async function main() {
  const [tabs, pendingMode] = await Promise.all([getWindowTabsByMru(), takePendingMode()]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <TabSwitcherPopup
          tabs={tabs}
          mode={pendingMode ?? 'switcher'}
          onSwitch={async (tabId) => {
            await chrome.tabs.update(tabId, { active: true });
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
