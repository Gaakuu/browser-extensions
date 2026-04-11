export class DownloadService {
  async saveAsFile(dataUrl: string, prefix = 'screenshot'): Promise<void> {
    const filename = this.generateFilename(prefix);
    return new Promise<void>((resolve, reject) => {
      chrome.downloads.download(
        { url: dataUrl, filename, saveAs: false },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        },
      );
    });
  }

  async copyToClipboard(dataUrl: string): Promise<void> {
    // 既存の Offscreen Document がある場合は閉じてから作り直す
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Copy screenshot to clipboard',
      });
    } catch {
      // 既に存在する場合は無視（そのまま使う）
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        dataUrl,
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Clipboard copy failed');
      }
    } finally {
      try {
        await chrome.offscreen.closeDocument();
      } catch {
        // 閉じれなくても無視
      }
    }
  }

  private generateFilename(prefix: string): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `${prefix}_${date}_${time}.png`;
  }
}
