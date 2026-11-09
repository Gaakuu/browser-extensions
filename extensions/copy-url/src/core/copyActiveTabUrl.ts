export type CopyResult = 'copied' | 'no-url' | 'failed';

export interface CopyActiveTabUrlDeps {
  getActiveTab: () => Promise<chrome.tabs.Tab | undefined>;
  /** クリップボードに書く。書けなければ false か例外 */
  writeText: (text: string) => Promise<boolean>;
  notify: (result: CopyResult, tab: chrome.tabs.Tab | undefined) => Promise<void>;
}

/** 読み込み中のタブは url が空で pendingUrl に行き先が入る */
export function urlOf(tab: chrome.tabs.Tab | undefined): string | undefined {
  return tab?.url || tab?.pendingUrl || undefined;
}

export async function copyActiveTabUrl(deps: CopyActiveTabUrlDeps): Promise<CopyResult> {
  const tab = await deps.getActiveTab();
  const url = urlOf(tab);

  let result: CopyResult;
  if (!url) {
    result = 'no-url';
  } else {
    try {
      result = (await deps.writeText(url)) ? 'copied' : 'failed';
    } catch {
      result = 'failed';
    }
  }

  await deps.notify(result, tab);
  return result;
}
