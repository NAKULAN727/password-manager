/**
 * Extension Settings — Persisted in chrome.storage.local.
 */

export interface ExtensionSettings {
  // Security
  autoLockTimeout: number; // minutes (0 = never)
  clipboardClearTimeout: number; // seconds

  // Autofill
  autofillMode: 'fill-only' | 'fill-and-submit';
  showAutofillBadge: boolean;
}

const SETTINGS_KEY = 'sphynx_settings';

const DEFAULT_SETTINGS: ExtensionSettings = {
  autoLockTimeout: 15, // 15 minutes
  clipboardClearTimeout: 30, // 30 seconds
  autofillMode: 'fill-only',
  showAutofillBadge: true,
};

/**
 * Get current settings (merged with defaults).
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = data[SETTINGS_KEY] || {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Save settings (partial update).
 */
export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  return updated;
}

/**
 * Reset settings to defaults.
 */
export async function resetSettings(): Promise<ExtensionSettings> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}
