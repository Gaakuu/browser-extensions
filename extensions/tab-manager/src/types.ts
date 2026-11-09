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
  /** 新しいウィンドウを開いたときに固定タブとして開く URL（並び順どおり） */
  alwaysPinnedUrls: string[];
  /** 固定タブをウィンドウ間でそろえるか（固定・固定解除・並べ替え・新しいウィンドウ） */
  syncPinnedTabs: boolean;
  /** 固定タブをこの分数以上見ていなかったら、戻ってきたときに登録した URL に戻す。0 は戻さない */
  resetPinnedAfterMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  // 18 時間（Arc の既定は 12 時間）
  thresholdHours: 18,
  archiveGroupedTabs: false,
  alwaysPinnedUrls: [],
  syncPinnedTabs: true,
  resetPinnedAfterMinutes: 30,
};

/** 選べる時間（Arc の選択肢に 1 時間と 18 時間を足したもの） */
export const THRESHOLD_CHOICES = [0, 1, 12, 18, 24, 24 * 7, 24 * 30] as const;

/** 固定タブを元の URL に戻すまでの分数の選択肢（0 は戻さない） */
export const RESET_PINNED_CHOICES = [0, 15, 30, 60, 120] as const;

export type BackgroundMessage = { type: 'ARCHIVE_NOW' };
