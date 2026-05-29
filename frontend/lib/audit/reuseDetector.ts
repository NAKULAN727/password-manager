/**
 * Password Reuse Detector — Phase 7: Security Audit Garden
 * 
 * Identifies groups of vault entries sharing identical passwords.
 * All comparisons occur in-memory using decrypted values.
 * No hashes, fingerprints, or comparison results are persisted.
 */

export interface ReuseGroup {
  /** Entry IDs sharing the same password */
  entryIds: string[];
  /** Labels of affected entries */
  labels: string[];
  /** Usernames of affected entries */
  usernames: string[];
  /** Number of entries in this reuse group */
  count: number;
}

export interface ReuseAnalysisResult {
  /** Groups of entries with identical passwords, sorted by count descending */
  reuseGroups: ReuseGroup[];
  /** Total number of entries involved in reuse */
  totalAffectedEntries: number;
  /** Number of unique passwords that are reused */
  uniqueReusedPasswords: number;
  /** Entry IDs that failed decryption */
  failedEntryIds: string[];
}

/**
 * Detects password reuse across vault entries.
 * 
 * @param decryptedPasswords - Map of entry ID to decrypted plaintext password
 * @param entryMetadata - Map of entry ID to { label, username }
 * @param failedEntryIds - IDs of entries that could not be decrypted
 * @returns Reuse analysis results with grouped entries
 */
export function detectReuse(
  decryptedPasswords: Map<string, string>,
  entryMetadata: Map<string, { label: string; username: string }>,
  failedEntryIds: string[] = []
): ReuseAnalysisResult {
  // Group entries by their plaintext password value
  const passwordGroups = new Map<string, string[]>();

  for (const [entryId, password] of decryptedPasswords) {
    if (!password) continue; // Skip empty passwords
    
    const existing = passwordGroups.get(password);
    if (existing) {
      existing.push(entryId);
    } else {
      passwordGroups.set(password, [entryId]);
    }
  }

  // Filter to only groups with 2+ entries (actual reuse)
  const reuseGroups: ReuseGroup[] = [];

  for (const [, entryIds] of passwordGroups) {
    if (entryIds.length >= 2) {
      const labels: string[] = [];
      const usernames: string[] = [];

      for (const id of entryIds) {
        const meta = entryMetadata.get(id);
        if (meta) {
          labels.push(meta.label);
          usernames.push(meta.username);
        }
      }

      reuseGroups.push({
        entryIds,
        labels,
        usernames,
        count: entryIds.length,
      });
    }
  }

  // Sort by count descending (largest reuse groups first)
  reuseGroups.sort((a, b) => b.count - a.count);

  const totalAffectedEntries = reuseGroups.reduce((sum, g) => sum + g.count, 0);

  return {
    reuseGroups,
    totalAffectedEntries,
    uniqueReusedPasswords: reuseGroups.length,
    failedEntryIds,
  };
}
