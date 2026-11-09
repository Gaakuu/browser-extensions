/** Service Worker → offscreen document：この文字列をクリップボードに書く */
export interface CopyTextMessage {
  target: 'offscreen';
  type: 'COPY_TEXT';
  text: string;
}

export interface CopyTextResponse {
  ok: boolean;
}

export function isCopyTextMessage(message: unknown): message is CopyTextMessage {
  if (typeof message !== 'object' || message === null) return false;
  const m = message as Partial<CopyTextMessage>;
  return m.target === 'offscreen' && m.type === 'COPY_TEXT' && typeof m.text === 'string';
}
