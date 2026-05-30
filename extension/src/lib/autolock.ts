/**
 * Auto-Lock System — Locks the vault after inactivity timeout.
 * Timer resets on any user activity (message from popup/content script).
 * Runs in the background service worker.
 */

import { getSettings } from './settings';

let lockTimer: ReturnType<typeof setTimeout> | null = null;
let onLockCallback: (() => void) | null = null;

/**
 * Initialize the auto-lock system with a callback to execute on lock.
 */
export function initAutoLock(onLock: () => void): void {
  onLockCallback = onLock;
}

/**
 * Reset the auto-lock timer (call on any user activity).
 */
export async function resetAutoLockTimer(): Promise<void> {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }

  const settings = await getSettings();
  const timeoutMinutes = settings.autoLockTimeout;

  // 0 = never auto-lock
  if (timeoutMinutes <= 0) return;

  const timeoutMs = timeoutMinutes * 60 * 1000;

  lockTimer = setTimeout(() => {
    console.log(`[Sphynx] Auto-lock triggered after ${timeoutMinutes} minutes of inactivity.`);
    if (onLockCallback) {
      onLockCallback();
    }
  }, timeoutMs);
}

/**
 * Stop the auto-lock timer (e.g., when vault is manually locked).
 */
export function stopAutoLockTimer(): void {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
}
