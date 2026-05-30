/**
 * Ignore List — Manages domains the user has chosen to never save credentials for.
 * Stored in chrome.storage.local (persisted across sessions).
 */

const STORAGE_KEY = 'sphynx_ignored_domains';

/**
 * Get all ignored domains.
 */
export async function getIgnoredDomains(): Promise<string[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

/**
 * Add a domain to the ignore list.
 */
export async function addIgnoredDomain(domain: string): Promise<void> {
  const normalized = domain.toLowerCase().trim();
  const current = await getIgnoredDomains();
  if (!current.includes(normalized)) {
    current.push(normalized);
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
  }
}

/**
 * Remove a domain from the ignore list.
 */
export async function removeIgnoredDomain(domain: string): Promise<void> {
  const normalized = domain.toLowerCase().trim();
  const current = await getIgnoredDomains();
  const filtered = current.filter(d => d !== normalized);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

/**
 * Check if a domain is in the ignore list.
 */
export async function isDomainIgnored(domain: string): Promise<boolean> {
  const normalized = domain.toLowerCase().trim();
  const current = await getIgnoredDomains();
  return current.includes(normalized);
}
