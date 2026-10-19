/** 自動で閉じて残したタブ1件 */
export interface ArchivedTab {
  /** 一覧で使う一意な ID（閉じた時刻とタブ ID から作る） */
  id: string;
  url: string;
  title: string;
  /** 閉じた時刻（ms） */
  archivedAt: number;
  /** 最後に見た時刻（ms） */
  lastAccessed: number;
}

export interface Settings {
  /** 見ていない時間がこれを超えたら閉じる。0 は自動で閉じない */
  thresholdHours: number;
  /** タブグループに入っているタブも閉じるか */
  archiveGroupedTabs: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  // Arc の既定と同じ 12 時間
  thresholdHours: 12,
  archiveGroupedTabs: false,
};

/** 選べる時間（Arc の選択肢に 1 時間を足したもの） */
export const THRESHOLD_CHOICES = [0, 1, 12, 24, 24 * 7, 24 * 30] as const;

export type BackgroundMessage = { type: 'ARCHIVE_NOW' };
