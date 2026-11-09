/**
 * ページの下に「コピーしました」を小さく出して、少しで消す。
 * chrome.scripting.executeScript で注入するので、この関数の外の変数を参照しない。
 */
export function showToast(message: string): void {
  const HOST_ID = '__copy-url-toast__';
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  // ページの CSS の影響を受けないように shadow DOM に入れる
  const root = host.attachShadow({ mode: 'closed' });
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'position: fixed',
    'left: 50%',
    'bottom: 24px',
    'transform: translateX(-50%)',
    'z-index: 2147483647',
    'padding: 8px 14px',
    'border-radius: 8px',
    'background: rgba(32, 33, 36, 0.92)',
    'color: #fff',
    'font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25)',
    'pointer-events: none',
    'opacity: 1',
    'transition: opacity 200ms ease-out',
  ].join(';');
  root.append(toast);
  document.documentElement.append(host);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => host.remove(), 250);
  }, 1200);
}
