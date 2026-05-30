/**
 * Domain matching and normalization utilities for credential management.
 */

/**
 * Extracts the root domain from a full hostname.
 * Examples:
 *   "accounts.google.com" → "google.com"
 *   "www.github.com" → "github.com"
 *   "login.reddit.com" → "reddit.com"
 *   "localhost:3000" → "localhost"
 */
export function getRootDomain(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Handle localhost and IP addresses
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return host;
  }

  const parts = host.split('.');

  // Handle two-part TLDs like .co.uk, .com.au
  const twoPartTLDs = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'co.in', 'org.uk'];
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTLDs.includes(lastTwo)) {
      return parts.slice(-3).join('.');
    }
  }

  // Standard: return last two parts
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return host;
}

/**
 * Normalizes a URL/hostname for consistent credential matching.
 * Returns lowercase root domain.
 */
export function normalizeDomain(input: string): string {
  try {
    // If it looks like a URL, parse it
    if (input.includes('://')) {
      const url = new URL(input);
      return getRootDomain(url.hostname).toLowerCase();
    }
    return getRootDomain(input).toLowerCase();
  } catch {
    return input.toLowerCase().split(':')[0];
  }
}

/**
 * Checks if two domains match (same root domain).
 */
export function domainsMatch(domain1: string, domain2: string): boolean {
  return normalizeDomain(domain1) === normalizeDomain(domain2);
}

/**
 * Checks if a credential entry matches a given domain.
 * Compares against the entry's label or stored URL.
 */
export function credentialMatchesDomain(
  entryLabel: string,
  entryUrl: string | undefined,
  targetDomain: string
): boolean {
  const normalizedTarget = normalizeDomain(targetDomain);

  // Check URL match
  if (entryUrl) {
    if (normalizeDomain(entryUrl) === normalizedTarget) return true;
  }

  // Check label match (labels often contain the site name)
  const normalizedLabel = entryLabel.toLowerCase().replace(/\s+/g, '');
  if (normalizedLabel.includes(normalizedTarget.split('.')[0])) return true;

  return false;
}

/**
 * Detects if a credential is a duplicate (same domain + same username).
 */
export function isDuplicate(
  entries: Array<{ label: string; username: string; url?: string }>,
  domain: string,
  username: string
): { isDuplicate: boolean; existingEntry?: { label: string; username: string; url?: string } } {
  const normalizedDomain = normalizeDomain(domain);
  const normalizedUsername = username.toLowerCase().trim();

  for (const entry of entries) {
    const entryMatchesDomain = credentialMatchesDomain(entry.label, entry.url, normalizedDomain);
    const entryMatchesUsername = entry.username.toLowerCase().trim() === normalizedUsername;

    if (entryMatchesDomain && entryMatchesUsername) {
      return { isDuplicate: true, existingEntry: entry };
    }
  }

  return { isDuplicate: false };
}
