/**
 * chrome.i18n.getMessage のラッパー。
 * chrome API が利用できない環境（Storybook 等）ではキー名をそのまま返す。
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }
  return key;
}
