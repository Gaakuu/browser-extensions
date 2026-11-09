import { copyActiveTabUrl } from '../core/copyActiveTabUrl';
import { notify } from './notify';
import { writeTextViaOffscreen } from './offscreenClipboard';

export const COMMAND_COPY_URL = 'copy-url';

function copy(tab?: chrome.tabs.Tab): Promise<unknown> {
  return copyActiveTabUrl({
    getActiveTab: async () =>
      tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0],
    writeText: writeTextViaOffscreen,
    notify,
  });
}

export function registerBackground(): void {
  // ショートカット（既定 ⌘⇧C）
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === COMMAND_COPY_URL) void copy(tab);
  });

  // ツールバーのアイコンを押しても同じことをする
  chrome.action.onClicked.addListener((tab) => {
    void copy(tab);
  });
}
