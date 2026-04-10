import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider, darkTheme } from '@browser-extensions/ui';
import { createRoot, type Root } from 'react-dom/client';
import type { TabInfo } from '../types/messages';
import { SearchOverlay } from '../components/SearchOverlay';
import { TabSwitcher } from '../components/TabSwitcher';

interface OverlayState {
  mode: 'switcher' | 'search';
  tabs: TabInfo[];
}

export class OverlayManager {
  private host: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private root: Root | null = null;
  private state: OverlayState | null = null;
  private onSwitch: (tabId: number) => void;
  private onClose: (tabId: number) => void;
  private onDismiss: () => void;

  constructor(
    onSwitch: (tabId: number) => void,
    onClose: (tabId: number) => void,
    onDismiss: () => void,
  ) {
    this.onSwitch = onSwitch;
    this.onClose = onClose;
    this.onDismiss = onDismiss;
  }

  show(mode: 'switcher' | 'search', tabs: TabInfo[]): void {
    this.state = { mode, tabs };

    if (!this.host) {
      this.createHost();
    }

    this.host!.style.display = 'flex';
    this.render();
  }

  hide(): void {
    if (this.host) {
      this.host.style.display = 'none';
    }
    this.state = null;
  }

  isVisible(): boolean {
    return this.host?.style.display === 'flex';
  }

  updateTabs(tabs: TabInfo[]): void {
    if (this.state) {
      this.state.tabs = tabs;
      this.render();
    }
  }

  removeTab(tabId: number): void {
    if (this.state) {
      this.state.tabs = this.state.tabs.filter((t) => t.id !== tabId);
      this.render();
    }
  }

  private createHost(): void {
    this.host = document.createElement('div');
    this.host.id = 'tab-switcher-overlay';
    this.host.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: none;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
    `;

    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    const mountPoint = document.createElement('div');
    this.shadowRoot.appendChild(mountPoint);

    const emotionCache = createCache({
      key: 'tab-switcher',
      container: this.shadowRoot,
    });

    this.root = createRoot(mountPoint);
    this.emotionCache = emotionCache;

    // 背景クリックで閉じる
    this.host.addEventListener('click', (e) => {
      if (e.target === this.host) {
        this.onDismiss();
      }
    });

    document.body.appendChild(this.host);
  }

  private emotionCache: ReturnType<typeof createCache> | null = null;

  private render(): void {
    if (!this.root || !this.state || !this.emotionCache) return;

    const { mode, tabs } = this.state;

    this.root.render(
      <CacheProvider value={this.emotionCache}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          {mode === 'switcher' ? (
            <TabSwitcher
              tabs={tabs}
              onSwitch={this.onSwitch}
              onClose={this.onClose}
              onDismiss={this.onDismiss}
            />
          ) : (
            <SearchOverlay
              tabs={tabs}
              onSwitch={this.onSwitch}
              onClose={this.onClose}
              onDismiss={this.onDismiss}
            />
          )}
        </ThemeProvider>
      </CacheProvider>,
    );
  }
}
