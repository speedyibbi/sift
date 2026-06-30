/**
 * storage.local-backed settings under a single key, so the options page reads
 * and writes them atomically. The API key lives here and never leaves the machine.
 */

import { storage } from '#imports';
import type { Settings } from '@/core';
import { DEFAULT_SETTINGS } from '@/config';

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export const getSettings = async (): Promise<Settings> => ({
  ...DEFAULT_SETTINGS,
  ...(await settingsItem.getValue()),
});
export const setSettings = (s: Settings): Promise<void> => settingsItem.setValue(s);
export const watchSettings = (cb: (s: Settings) => void) => settingsItem.watch(cb);
