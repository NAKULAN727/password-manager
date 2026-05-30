/**
 * Vault Activity Tracking — Tracks credential usage metadata.
 * Never stores plaintext credentials. Only stores:
 * - entry ID
 * - label
 * - last used timestamp
 * - use count
 */

const ACTIVITY_KEY = 'sphynx_activity';
const MAX_RECENT = 10;

export interface ActivityRecord {
  entryId: string;
  label: string;
  lastUsed: number; // timestamp
  useCount: number;
}

/**
 * Get all activity records.
 */
export async function getActivityRecords(): Promise<ActivityRecord[]> {
  const data = await chrome.storage.local.get(ACTIVITY_KEY);
  return data[ACTIVITY_KEY] || [];
}

/**
 * Record a credential usage event.
 */
export async function recordUsage(entryId: string, label: string): Promise<void> {
  const records = await getActivityRecords();
  const existing = records.find(r => r.entryId === entryId);

  if (existing) {
    existing.lastUsed = Date.now();
    existing.useCount++;
    existing.label = label; // Update label in case it changed
  } else {
    records.push({
      entryId,
      label,
      lastUsed: Date.now(),
      useCount: 1,
    });
  }

  // Keep only the most recent entries
  records.sort((a, b) => b.lastUsed - a.lastUsed);
  const trimmed = records.slice(0, MAX_RECENT);

  await chrome.storage.local.set({ [ACTIVITY_KEY]: trimmed });
}

/**
 * Get recently used credentials (sorted by last used).
 */
export async function getRecentCredentials(): Promise<ActivityRecord[]> {
  const records = await getActivityRecords();
  return records.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 5);
}

/**
 * Get most used credentials (sorted by use count).
 */
export async function getMostUsedCredentials(): Promise<ActivityRecord[]> {
  const records = await getActivityRecords();
  return records.sort((a, b) => b.useCount - a.useCount).slice(0, 5);
}

/**
 * Clear all activity records.
 */
export async function clearActivity(): Promise<void> {
  await chrome.storage.local.remove(ACTIVITY_KEY);
}
