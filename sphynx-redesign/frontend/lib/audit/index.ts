/**
 * Security Audit Garden — Module Index
 * Phase 7: Client-side security intelligence engine
 */

export { analyzePassword, type StrengthResult, type PasswordClassification } from './strengthAnalyzer';
export { detectReuse, type ReuseGroup, type ReuseAnalysisResult } from './reuseDetector';
export { analyzeAging, type AgingTier, type AgingResult, type AgingAnalysisResult } from './agingTracker';
export { computeHealthScore, type SecurityLevel, type HealthScoreResult } from './healthScorer';
export { generateRecommendations, type Recommendation, type RecommendationCategory, type RecommendationResult } from './recommendationEngine';
