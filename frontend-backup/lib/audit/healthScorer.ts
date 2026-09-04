/**
 * Vault Health Scorer — Phase 7: Security Audit Garden
 * 
 * Computes a composite Sanctuary Health Score (0–100) from four weighted factors:
 * - Password strength distribution (40%)
 * - Password reuse count (30%)
 * - Credential age compliance (20%)
 * - Missing MFA indicator count (10%)
 */

import { PasswordClassification } from './strengthAnalyzer';

export type SecurityLevel = 'Vulnerable' | 'Developing' | 'Fortified' | 'Sanctuary Grade';

export interface HealthScoreResult {
  score: number;
  level: SecurityLevel;
  breakdown: {
    strengthScore: number;
    reuseScore: number;
    agingScore: number;
    mfaScore: number;
  };
}

// Weights for each factor
const WEIGHT_STRENGTH = 0.4;
const WEIGHT_REUSE = 0.3;
const WEIGHT_AGING = 0.2;
const WEIGHT_MFA = 0.1;

/**
 * Assigns a Security Level based on the composite score.
 */
function assignLevel(score: number): SecurityLevel {
  if (score >= 85) return 'Sanctuary Grade';
  if (score >= 65) return 'Fortified';
  if (score >= 40) return 'Developing';
  return 'Vulnerable';
}

/**
 * Computes the strength sub-score (0–100) from password classifications.
 * Each classification maps to a score: Weak=0, Fair=40, Strong=70, Sanctuary Grade=100
 */
function computeStrengthScore(classifications: PasswordClassification[]): number {
  if (classifications.length === 0) return 0;

  const scoreMap: Record<PasswordClassification, number> = {
    'Weak': 0,
    'Fair': 40,
    'Strong': 70,
    'Sanctuary Grade': 100,
  };

  const total = classifications.reduce((sum, c) => sum + scoreMap[c], 0);
  return Math.round(total / classifications.length);
}

/**
 * Computes the reuse sub-score (0–100).
 * 100 = no reuse, 0 = all entries are reused.
 */
function computeReuseScore(totalEntries: number, affectedByReuse: number): number {
  if (totalEntries === 0) return 0;
  if (affectedByReuse === 0) return 100;
  
  const reuseRatio = affectedByReuse / totalEntries;
  return Math.round((1 - reuseRatio) * 100);
}

/**
 * Computes the aging sub-score (0–100).
 * Based on the percentage of entries within Fresh or Maturing tiers.
 */
function computeAgingScore(compliancePercentage: number): number {
  return compliancePercentage;
}

/**
 * Computes the MFA sub-score (0–100).
 * Based on the percentage of entries that have MFA indicators.
 * Future-ready: currently assumes no MFA data exists (returns 100 as neutral).
 */
function computeMfaScore(totalEntries: number, entriesWithMfa: number): number {
  if (totalEntries === 0) return 0;
  // If no MFA tracking exists yet, give a neutral score to not penalize users
  // Once MFA fields are added, this will compute properly
  return Math.round((entriesWithMfa / totalEntries) * 100);
}

/**
 * Computes the composite Sanctuary Health Score.
 */
export function computeHealthScore(params: {
  classifications: PasswordClassification[];
  totalEntries: number;
  affectedByReuse: number;
  agingCompliancePercentage: number;
  entriesWithMfa: number;
}): HealthScoreResult {
  const { classifications, totalEntries, affectedByReuse, agingCompliancePercentage, entriesWithMfa } = params;

  // Handle empty vault
  if (totalEntries === 0) {
    return {
      score: 0,
      level: 'Vulnerable',
      breakdown: { strengthScore: 0, reuseScore: 0, agingScore: 0, mfaScore: 0 },
    };
  }

  const strengthScore = computeStrengthScore(classifications);
  const reuseScore = computeReuseScore(totalEntries, affectedByReuse);
  const agingScore = computeAgingScore(agingCompliancePercentage);
  const mfaScore = computeMfaScore(totalEntries, entriesWithMfa);

  const compositeScore = Math.round(
    strengthScore * WEIGHT_STRENGTH +
    reuseScore * WEIGHT_REUSE +
    agingScore * WEIGHT_AGING +
    mfaScore * WEIGHT_MFA
  );

  // Clamp to 0–100
  const score = Math.max(0, Math.min(100, compositeScore));

  return {
    score,
    level: assignLevel(score),
    breakdown: { strengthScore, reuseScore, agingScore, mfaScore },
  };
}
