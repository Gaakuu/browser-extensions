export class DownloadService {
  async saveAsFile(dataUrl: string): Promise<void> {
    const filename = this.generateFilename();
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
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Copy screenshot to clipboard',
    });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        dataUrl,
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Clipboard copy failed');
      }
    } finally {
      await chrome.offscreen.closeDocument();
    }
  }

  private generateFilename(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `screenshot_${date}_${time}.png`;
  }
}
