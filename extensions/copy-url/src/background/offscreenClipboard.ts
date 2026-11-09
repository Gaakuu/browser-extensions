import type { CopyTextMessage, CopyTextResponse } from '../core/messages';

const OFFSCREEN_PATH = 'offscreen.html';

let creating: Promise<void> | undefined;

/** offscreen document は拡張ごとに1つだけ。無ければ作る（同時に呼ばれても1回だけ作る） */
async function ensureOffscreenDocument(): Promise<void> {
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
    documentUrls: [url],
  });
  if (contexts.length > 0) return;

  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['CLIPBOARD' as chrome.offscreen.Reason],
      justification: '今のタブの URL をクリップボードに書くため',
    })
    .finally(() => {
      creating = undefined;
    });
  await creating;
}

/** Service Worker はクリップボードに触れないので、offscreen document に書かせる */
export async function writeTextViaOffscreen(text: string): Promise<boolean> {
  await ensureOffscreenDocument();
  const message: CopyTextMessage = { target: 'offscreen', type: 'COPY_TEXT', text };
  const response = (await chrome.runtime.sendMessage(message)) as CopyTextResponse | undefined;
  return response?.ok === true;
}
