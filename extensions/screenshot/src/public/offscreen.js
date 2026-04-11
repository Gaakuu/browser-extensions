chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'COPY_TO_CLIPBOARD') return;

  (async () => {
    try {
      const response = await fetch(message.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});
