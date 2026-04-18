import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabInfo } from '../types/messages';
import { OverlayManager } from './OverlayManager';

const makeTabs = (): TabInfo[] => [
  { id: 1, title: 'Tab 1', url: 'https://example.com/1', favIconUrl: '', lastAccessed: 2 },
  { id: 2, title: 'Tab 2', url: 'https://example.com/2', favIconUrl: '', lastAccessed: 1 },
];

describe('OverlayManager', () => {
  let manager: OverlayManager;
  let onSwitch: (tabId: number) => void;
  let onClose: (tabId: number) => void;
  let onDismiss: () => void;

  beforeEach(() => {
    // jsdom は scrollIntoView を未実装
    Element.prototype.scrollIntoView = vi.fn();
    onSwitch = vi.fn();
    onClose = vi.fn();
    onDismiss = vi.fn();
    manager = new OverlayManager(onSwitch, onClose, onDismiss);
  });

  afterEach(() => {
    manager.hide();
    document.body.innerHTML = '';
  });

  describe('hide 後のキーイベント', () => {
    it('switcher モードで hide 後の Enter が onSwitch を発火させない', async () => {
      await act(async () => {
        manager.show('switcher', makeTabs());
      });

      await act(async () => {
        manager.hide();
      });

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onSwitch).not.toHaveBeenCalled();
    });

    it('search モードで hide 後の Enter が onSwitch を発火させない', async () => {
      await act(async () => {
        manager.show('search', makeTabs());
      });

      await act(async () => {
        manager.hide();
      });

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onSwitch).not.toHaveBeenCalled();
    });
  });
});
