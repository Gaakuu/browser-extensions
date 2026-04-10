export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  lastAccessed: number;
}

export interface HighlightRange {
  field: 'title' | 'url';
  start: number;
  end: number;
}

// Background → Content Script
export type BackgroundMessage =
  | { type: 'SHOW_SWITCHER'; tabs: TabInfo[] }
  | { type: 'SHOW_SEARCH'; tabs: TabInfo[] }
  | { type: 'TAB_CLOSED'; tabId: number }
  | { type: 'MOVE_FOCUS_DOWN' };

// Content Script → Background
export type ContentMessage =
  | { type: 'SWITCH_TO_TAB'; tabId: number }
  | { type: 'CLOSE_TAB'; tabId: number }
  | { type: 'GET_ALL_TABS' }
  | { type: 'OVERLAY_CLOSED' };
