import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider, createTheme, darkThemeOptions } from '@browser-extensions/ui';
import { createRoot, type Root } from 'react-dom/client';
import type { CropRect, Point, BackgroundMessage } from '../types/messages';
import { CaptureOverlay } from '../components/CaptureOverlay';
import { Toolbar } from '../components/Toolbar';
import { Preview } from '../components/Preview';
import { ElementDetector } from './ElementDetector';
import { CropHandler } from './CropHandler';

type OverlayMode = 'idle' | 'element' | 'crop' | 'preview';

interface OverlayState {
  mode: OverlayMode;
  highlightRect: DOMRect | null;
  cropRect: { x: number; y: number; width: number; height: number } | null;
  previewUrl: string | null;
  clipboardStatus: 'success' | 'error' | null;
}

export class OverlayManager {
  private host: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private root: Root | null = null;
  private emotionCache: ReturnType<typeof createCache> | null = null;
  private elementDetector: ElementDetector | null = null;
  private cropHandler: CropHandler | null = null;

  private state: OverlayState = {
    mode: 'idle',
    highlightRect: null,
    cropRect: null,
    previewUrl: null,
    clipboardStatus: null,
  };

  private onMessage: (message: any) => void;
  private onDismiss: () => void;

  constructor(
    onMessage: (message: any) => void,
    onDismiss: () => void,
  ) {
    this.onMessage = onMessage;
    this.onDismiss = onDismiss;
  }

  show(): void {
    if (!this.host) {
      this.createHost();
    }

    this.state = {
      mode: 'element',
      highlightRect: null,
      cropRect: null,
      previewUrl: null,
      clipboardStatus: null,
    };

    this.host!.style.display = 'block';
    this.startElementDetection();
    this.render();
  }

  hide(): void {
    this.stopDetection();

    if (this.host) {
      this.host.style.display = 'none';
    }

    this.state = {
      mode: 'idle',
      highlightRect: null,
      cropRect: null,
      previewUrl: null,
      clipboardStatus: null,
    };
  }

  isVisible(): boolean {
    return this.host?.style.display === 'block';
  }

  showPreview(dataUrl: string, clipboardStatus: 'success' | 'error'): void {
    this.stopDetection();
    this.host!.style.display = 'block';
    this.state = {
      ...this.state,
      mode: 'preview',
      previewUrl: dataUrl,
      clipboardStatus,
      highlightRect: null,
      cropRect: null,
    };
    this.render();
  }

  /** オーバーレイを非表示にしてからキャプチャメッセージを送信する */
  private requestCapture(message: any): void {
    this.stopDetection();
    // React を空にしてから DOM を非表示にし、リペイントを待ってキャプチャ
    this.root?.render(null);
    this.host!.style.display = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.onMessage(message);
      });
    });
  }

  private startElementDetection(): void {
    this.stopDetection();

    this.elementDetector = new ElementDetector({
      onHover: (rect) => {
        this.state.highlightRect = rect;
        this.render();
      },
      onElementSelected: (rect) => {
        const padding = 8;
        const cropRect: CropRect = {
          x: rect.x - padding,
          y: rect.y - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          devicePixelRatio: window.devicePixelRatio,
        };
        this.requestCapture({ type: 'CAPTURE_ELEMENT', rect: cropRect });
      },
      onDragStart: (startPoint) => {
        this.startCrop(startPoint);
      },
      excludeElement: this.host!,
    });

    this.elementDetector.start();
  }

  private startCrop(startPoint: Point): void {
    this.elementDetector?.stop();

    this.state.mode = 'crop';
    this.state.highlightRect = null;

    this.cropHandler = new CropHandler({
      onCropUpdate: (rect) => {
        this.state.cropRect = rect;
        this.render();
      },
      onCropComplete: (rect) => {
        this.requestCapture({ type: 'CAPTURE_AREA', rect });
      },
      onCancel: () => {
        this.state.mode = 'element';
        this.state.cropRect = null;
        this.startElementDetection();
        this.render();
      },
    });

    this.cropHandler.start(startPoint);
    this.render();
  }

  private stopDetection(): void {
    this.elementDetector?.stop();
    this.elementDetector = null;
    this.cropHandler?.stop();
    this.cropHandler = null;
  }

  private createHost(): void {
    this.host = document.createElement('div');
    this.host.id = 'screenshot-overlay';
    this.host.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: none;
      z-index: 2147483647;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      line-height: normal;
    `;

    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
      :host {
        font-size: 16px;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
    `;
    this.shadowRoot.appendChild(resetStyle);

    const styleContainer = document.createElement('div');
    this.shadowRoot.appendChild(styleContainer);

    const mountPoint = document.createElement('div');
    this.shadowRoot.appendChild(mountPoint);

    this.emotionCache = createCache({
      key: 'screenshot',
      container: styleContainer,
    });

    this.root = createRoot(mountPoint);

    // Esc で全体終了
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible() && this.state.mode !== 'crop') {
        this.onDismiss();
      }
    }, true);

    // オーバーレイ表示中はキーイベントを背景サイトに渡さない
    const blockKeyEvent = (e: KeyboardEvent) => {
      if (this.isVisible()) {
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', blockKeyEvent, true);
    document.addEventListener('keyup', blockKeyEvent, true);

    // 背景スクロール防止
    document.addEventListener(
      'wheel',
      (e) => {
        if (!this.isVisible()) return;
        const path = e.composedPath();
        const isInsideOverlay = path.some(
          (el) => el === this.host || (el instanceof Node && this.shadowRoot?.contains(el)),
        );
        if (!isInsideOverlay) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    document.body.appendChild(this.host);
  }

  private getTheme() {
    const htmlFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return createTheme({
      ...darkThemeOptions,
      typography: {
        ...(darkThemeOptions.typography as object),
        htmlFontSize,
      },
    });
  }

  private render(): void {
    if (!this.root || !this.emotionCache) return;

    const theme = this.getTheme();
    const { mode, highlightRect, cropRect, previewUrl, clipboardStatus } = this.state;

    this.root.render(
      <CacheProvider value={this.emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />

          {(mode === 'element' || mode === 'crop') && (
            <>
              <CaptureOverlay
                mode={mode === 'crop' ? 'crop' : 'element'}
                highlightRect={highlightRect}
                cropRect={cropRect}
              />
              <Toolbar
                position="top"
                onFullPage={() => this.requestCapture({ type: 'CAPTURE_FULL_PAGE' })}
                onVisibleArea={() => this.requestCapture({ type: 'CAPTURE_VISIBLE_AREA' })}
                onSettings={() => {}}
              />
            </>
          )}

          {mode === 'preview' && previewUrl && (
            <Preview
              imageUrl={previewUrl}
              clipboardStatus={clipboardStatus}
              onSave={() => this.onMessage({ type: 'SAVE_FILE', dataUrl: previewUrl })}
              onClose={() => this.onDismiss()}
            />
          )}
        </ThemeProvider>
      </CacheProvider>,
    );
  }
}
