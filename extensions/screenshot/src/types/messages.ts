/** キャプチャ対象の矩形情報 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}

/** 座標 */
export interface Point {
  x: number;
  y: number;
}

/** キャプチャモード */
export type CaptureMode = 'element' | 'crop' | 'fullPage' | 'visibleArea';

/** Background → Content Script */
export type BackgroundMessage =
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_RESULT'; dataUrl: string }
  | { type: 'CAPTURE_PROGRESS'; progress: number }
  | { type: 'CAPTURE_ERROR'; error: string };

/** Content Script → Background */
export type ContentMessage =
  | { type: 'CAPTURE_VISIBLE_AREA' }
  | { type: 'CAPTURE_FULL_PAGE' }
  | { type: 'CAPTURE_ELEMENT'; rect: CropRect }
  | { type: 'CAPTURE_AREA'; rect: CropRect }
  | { type: 'SAVE_FILE'; dataUrl: string; filenamePrefix?: string }
  | { type: 'OVERLAY_CLOSED' };

/** 設定データ（Chrome Storage） */
export interface ScreenshotSettings {
  autoCopyToClipboard: boolean;
  filenamePrefix: string;
}
