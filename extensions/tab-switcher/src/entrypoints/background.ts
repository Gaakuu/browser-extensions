import { registerBackground } from '../background/registerBackground';
import { TabHistoryManager } from '../background/TabHistoryManager';

export default defineBackground(async () => {
  const manager = new TabHistoryManager();
  await manager.init();

  console.log('[Tab Switcher] Background initialized, tabs:', manager.getAllTabs().length);

  registerBackground(manager);
});
