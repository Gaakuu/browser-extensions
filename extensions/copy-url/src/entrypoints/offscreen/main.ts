import { copyText } from '../../core/copyText';
import { type CopyTextResponse, isCopyTextMessage } from '../../core/messages';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isCopyTextMessage(message)) return undefined;
  copyText(message.text).then((ok) => sendResponse({ ok } satisfies CopyTextResponse));
  return true;
});
