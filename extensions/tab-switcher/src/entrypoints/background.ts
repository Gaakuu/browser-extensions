import { registerBackground } from '../background/registerBackground';

export default defineBackground(() => {
  // リスナーは起動のたびに同期で登録する（Service Worker が止まっても次のイベントで起き直す）
  registerBackground();
});
