export interface TabInfo {
  id: number;
  windowId: number;
  /** ウィンドウ内の並び。MRU が同順のときの決め手 */
  index: number;
  title: string;
  url: string;
  favIconUrl: string;
  /** Chrome が記録した最後にアクティブになった時刻（ms）。古い Chrome では無い */
  lastAccessed?: number;
}

/** ポップアップの開き方 */
export type PopupMode = 'switcher' | 'search';
