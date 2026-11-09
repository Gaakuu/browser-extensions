/**
 * offscreen document の中でクリップボードに書く。
 * offscreen document はフォーカスを持てないので navigator.clipboard は失敗しやすい。
 * textarea を選択して execCommand('copy') するのを先に試し、だめなら navigator.clipboard に回す。
 */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  const textarea = doc.createElement('textarea');
  textarea.value = text;
  doc.body.append(textarea);
  try {
    textarea.select();
    if (doc.execCommand?.('copy')) return true;
  } catch {
    // 下の navigator.clipboard に回す
  } finally {
    textarea.remove();
  }

  try {
    await doc.defaultView?.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
