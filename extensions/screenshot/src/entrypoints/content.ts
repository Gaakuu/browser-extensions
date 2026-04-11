export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Screenshot extension content script loaded');
  },
});
