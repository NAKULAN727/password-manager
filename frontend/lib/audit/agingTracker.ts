/**
 * Credential Aging Tracker — Phase 7: Security Audit Garden
 * 
 * Monitors credential creation and update timestamps to identify
 * passwords requiring rotation. Uses client-side date calculations only.
 */

export type AgingTier = 'Fresh' | 'Maturing' | 'Aging';

export interface AgingResult {
  entryId: string;
  label: string;
  ageDays: number;
  tier: AgingTier;
  lastUpdated: string;
}

export interface AgingAnalysisResult {
  /** All entries with their aging tier assignments */
  entries: AgingResult[];
  /** Count of entries in each tier */
  tierCounts: { fresh: number; maturing: number; aging: number };
  /** Entries in the Aging tier, sorted oldest first */
  agingEntries: AgingResult[];
  /** Percentage of entries within Fresh or Maturing tiers (age compliance) */
  compliancePercentage: number;
}

/**
 * Calculates the number of whole days between two dates.
 */
function daysBetween(dateStr: string, now: Date): number {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Assigns an aging tier based on credential age in days.
 */
function assignTier(ageDays: number): AgingTier {
  if (ageDays <= 30) return 'Fresh';
  if (ageDays <= 90) return 'Maturing';
  return 'Aging';
}

/**
 * Analyzes credential aging across all vault entries.
 * 
 * @param entries - Array of entries with id, label, createdAt, updatedAt
 * @returns Aging analysis with tier assignments and compliance metrics
 */
export function analyzeAging(
  entries: Array<{ id: string; label: string; createdAt: string; updatedAt: string }>
): AgingAnalysisResult {
  const now = new Date();
  const results: AgingResult[] = [];

  for (const entry of entries) {
    // Use updatedAt if available, fall back to createdAt
    const referenceDate = entry.updatedAt || entry.createdAt;
    const ageDays = daysBetween(referenceDate, now);
    const tier = assignTier(ageDays);

    results.push({
      entryId: entry.id,
      label: entry.label,
      ageDays,
      tier,
      lastUpdated: referenceDate,
    });
  }

  // Compute tier counts
  const tierCounts = { fresh: 0, maturing: 0, aging: 0 };
  for (const r of results) {
    if (r.tier === 'Fresh') tierCounts.fresh++;
    else if (r.tier === 'Maturing') tierCounts.maturing++;
    else tierCounts.aging++;
  }

  // Filter and sort aging entries (oldest first)
  const agingEntries = results
    .filter((r) => r.tier === 'Aging')
    .sort((a, b) => b.ageDays - a.ageDays);

  // Compliance: percentage of entries in Fresh or Maturing
  const totalEntries = results.length;
  const compliancePercentage = totalEntries > 0
    ? Math.round(((tierCounts.fresh + tierCounts.maturing) / totalEntries) * 100)
    : 0;

  return {
    entries: results,
    tierCounts,
    agingEntries,
    compliancePercentage,
  };
}
