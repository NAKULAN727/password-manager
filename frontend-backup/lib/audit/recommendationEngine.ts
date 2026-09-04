/**
 * Security Recommendations Engine — Phase 7: Security Audit Garden
 * 
 * Generates prioritized, encouraging, and educational security suggestions.
 * Recommendations are phrased to empower users without fear-based language.
 */

import { PasswordClassification } from './strengthAnalyzer';
import { ReuseGroup } from './reuseDetector';
import { AgingResult } from './agingTracker';

export type RecommendationCategory = 'reuse' | 'weak' | 'aging';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  entryLabels: string[];
  entryIds: string[];
  title: string;
  description: string;
  action: string;
  severity: number; // Higher = more urgent
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  totalCount: number;
  isAllClear: boolean;
  allClearMessage: string;
}

/**
 * Generates reuse-based recommendations.
 * Priority: largest reuse groups first.
 */
function generateReuseRecommendations(reuseGroups: ReuseGroup[]): Recommendation[] {
  return reuseGroups.map((group, idx) => ({
    id: `reuse-${idx}`,
    category: 'reuse' as RecommendationCategory,
    entryLabels: group.labels,
    entryIds: group.entryIds,
    title: `${group.count} accounts share the same password`,
    description: `Using the same password across ${group.labels.slice(0, 3).join(', ')}${group.labels.length > 3 ? ` and ${group.labels.length - 3} more` : ''} means a single breach could expose all of them. Each account deserves its own unique key.`,
    action: 'Generate unique passwords for each account in this group',
    severity: group.count * 10, // Larger groups = higher severity
  }));
}

/**
 * Generates weakness-based recommendations.
 * Priority: lowest entropy first.
 */
function generateWeaknessRecommendations(
  weakEntries: Array<{ id: string; label: string; entropy: number; classification: PasswordClassification }>
): Recommendation[] {
  // Sort by entropy ascending (weakest first)
  const sorted = [...weakEntries].sort((a, b) => a.entropy - b.entropy);

  return sorted.map((entry, idx) => {
    const isVeryWeak = entry.classification === 'Weak';
    return {
      id: `weak-${idx}`,
      category: 'weak' as RecommendationCategory,
      entryLabels: [entry.label],
      entryIds: [entry.id],
      title: isVeryWeak
        ? `"${entry.label}" could use a stronger foundation`
        : `"${entry.label}" has room to grow stronger`,
      description: isVeryWeak
        ? `This password has low entropy (${entry.entropy} bits). A longer password with mixed characters would significantly strengthen this credential's resilience.`
        : `At ${entry.entropy} bits of entropy, this password is fair but could be elevated. Adding length and character variety builds a more resilient defense.`,
      action: 'Replace with a generated high-entropy password',
      severity: Math.max(1, 50 - entry.entropy), // Lower entropy = higher severity
    };
  });
}

/**
 * Generates aging-based recommendations.
 * Priority: oldest credentials first.
 */
function generateAgingRecommendations(agingEntries: AgingResult[]): Recommendation[] {
  // Already sorted oldest first from agingTracker
  return agingEntries.map((entry, idx) => ({
    id: `aging-${idx}`,
    category: 'aging' as RecommendationCategory,
    entryLabels: [entry.label],
    entryIds: [entry.entryId],
    title: `"${entry.label}" hasn't been refreshed in ${entry.ageDays} days`,
    description: `Credentials that remain unchanged for extended periods have a wider exposure window if compromised. Periodic rotation keeps your sanctuary resilient.`,
    action: 'Rotate this password with a fresh, unique credential',
    severity: Math.min(entry.ageDays / 10, 20), // Cap severity
  }));
}

/**
 * Generates the full prioritized recommendation list.
 * Order: reuse → weak → aging, each sorted by severity descending.
 */
export function generateRecommendations(params: {
  reuseGroups: ReuseGroup[];
  weakEntries: Array<{ id: string; label: string; entropy: number; classification: PasswordClassification }>;
  agingEntries: AgingResult[];
  totalEntries: number;
  allSanctuaryGrade: boolean;
  noReuse: boolean;
  allFresh: boolean;
}): RecommendationResult {
  const { reuseGroups, weakEntries, agingEntries, totalEntries, allSanctuaryGrade, noReuse, allFresh } = params;

  // Check if vault is in perfect state
  if (totalEntries > 0 && allSanctuaryGrade && noReuse && allFresh) {
    return {
      recommendations: [],
      totalCount: 0,
      isAllClear: true,
      allClearMessage: 'Your sanctuary is flourishing. Every credential meets the highest security standards — strong, unique, and freshly maintained. Well done, guardian.',
    };
  }

  // Generate recommendations by category
  const reuseRecs = generateReuseRecommendations(reuseGroups);
  const weakRecs = generateWeaknessRecommendations(weakEntries);
  const agingRecs = generateAgingRecommendations(agingEntries);

  // Combine in priority order: reuse → weak → aging
  const allRecommendations = [...reuseRecs, ...weakRecs, ...agingRecs];

  return {
    recommendations: allRecommendations,
    totalCount: allRecommendations.length,
    isAllClear: false,
    allClearMessage: '',
  };
}
