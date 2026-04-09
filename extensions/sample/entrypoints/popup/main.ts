import { getStorageItem, setStorageItem } from '@browser-extensions/shared';

async function init() {
  const btn = document.getElementById('btn')!;
  const message = document.getElementById('message')!;

  let count = await getStorageItem('clickCount', 0);
  message.textContent = `クリック回数: ${count}`;

  btn.addEventListener('click', async () => {
    count++;
    await setStorageItem('clickCount', count);
    message.textContent = `クリック回数: ${count}`;
  });
}

init();
