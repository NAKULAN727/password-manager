/**
 * Security Audit Store — Phase 7: Security Audit Garden
 * 
 * Dedicated Zustand store for audit state management.
 * Cleanly separated from the Vault_Store.
 * All analysis occurs client-side; no data is persisted or transmitted.
 */

import { create } from 'zustand';
import { useVaultStore, EncryptedVaultEntry } from './useVaultStore';
import { decryptEntry } from '../lib/crypto/vault';
import {
  analyzePassword,
  detectReuse,
  analyzeAging,
  computeHealthScore,
  generateRecommendations,
  type PasswordClassification,
  type SecurityLevel,
  type StrengthResult,
  type ReuseGroup,
  type AgingResult,
  type AgingAnalysisResult,
  type HealthScoreResult,
  type Recommendation,
} from '../lib/audit';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EntryStrengthData {
  entryId: string;
  label: string;
  classification: PasswordClassification;
  entropy: number;
  patternsDetected: string[];
}

export interface AuditState {
  // Core computed state
  healthScore: number;
  securityLevel: SecurityLevel;
  strengthData: EntryStrengthData[];
  reuseGroups: ReuseGroup[];
  agingAnalysis: AgingAnalysisResult | null;
  recommendations: Recommendation[];
  totalRecommendations: number;
  isAllClear: boolean;
  allClearMessage: string;

  // Lifecycle state
  isStale: boolean;
  isAnalyzing: boolean;
  analysisError: string | null;
  failedEntryIds: string[];

  // Actions
  runAnalysis: () => Promise<void>;
  markStale: () => void;
  resetAudit: () => void;
}

const INITIAL_STATE = {
  healthScore: 0,
  securityLevel: 'Vulnerable' as SecurityLevel,
  strengthData: [] as EntryStrengthData[],
  reuseGroups: [] as ReuseGroup[],
  agingAnalysis: null as AgingAnalysisResult | null,
  recommendations: [] as Recommendation[],
  totalRecommendations: 0,
  isAllClear: false,
  allClearMessage: '',
  isStale: true,
  isAnalyzing: false,
  analysisError: null as string | null,
  failedEntryIds: [] as string[],
};

export const useAuditStore = create<AuditState>((set, get) => ({
  ...INITIAL_STATE,

  /**
   * Marks the audit analysis as stale (needs recomputation).
   * Called when vault entries change.
   */
  markStale: () => {
    set({ isStale: true });
  },

  /**
   * Resets all audit state to initial values.
   * Called when the vault is locked.
   */
  resetAudit: () => {
    set({ ...INITIAL_STATE });
  },

  /**
   * Runs the full security analysis pipeline:
   * 1. Decrypt all entries one at a time
   * 2. Analyze password strength
   * 3. Detect reuse
   * 4. Analyze aging
   * 5. Compute health score
   * 6. Generate recommendations
   * 
   * All computation is client-side. Decrypted values are cleared after use.
   */
  runAnalysis: async () => {
    const { isAnalyzing } = get();
    if (isAnalyzing) return; // Prevent concurrent runs

    set({ isAnalyzing: true, analysisError: null });

    try {
      const vaultState = useVaultStore.getState();
      const { kVault, vaultEntries, isUnlocked } = vaultState;

      // Guard: vault must be unlocked with a valid key
      if (!isUnlocked || !kVault) {
        set({ ...INITIAL_STATE, isAnalyzing: false });
        return;
      }

      // Handle empty vault
      if (vaultEntries.length === 0) {
        set({
          ...INITIAL_STATE,
          isStale: false,
          isAnalyzing: false,
        });
        return;
      }

      // ─── Phase 1: Decrypt & Analyze Strength ─────────────────────────
      const strengthData: EntryStrengthData[] = [];
      const decryptedPasswords = new Map<string, string>();
      const entryMetadata = new Map<string, { label: string; username: string }>();
      const failedEntryIds: string[] = [];

      for (const entry of vaultEntries) {
        // Check if vault was locked during analysis
        if (!useVaultStore.getState().isUnlocked) {
          set({ ...INITIAL_STATE, isAnalyzing: false });
          return;
        }

        try {
          // Decrypt one entry at a time
          let plaintext = await decryptEntry(
            entry.ciphertext,
            entry.iv,
            entry.tag,
            kVault
          );

          // Analyze strength
          const result = analyzePassword(plaintext);
          strengthData.push({
            entryId: entry.id,
            label: entry.label,
            classification: result.classification,
            entropy: result.entropy,
            patternsDetected: result.patternsDetected,
          });

          // Store for reuse detection
          decryptedPasswords.set(entry.id, plaintext);
          entryMetadata.set(entry.id, { label: entry.label, username: entry.username });

          // Clear plaintext from this scope
          plaintext = '';
        } catch (err) {
          // Clear any partial data and skip this entry
          failedEntryIds.push(entry.id);
          continue;
        }
      }

      // ─── Phase 2: Reuse Detection ───────────────────────────────────
      const reuseResult = detectReuse(decryptedPasswords, entryMetadata, failedEntryIds);

      // Clear all decrypted passwords from memory immediately
      for (const [key] of decryptedPasswords) {
        decryptedPasswords.set(key, '');
      }
      decryptedPasswords.clear();

      // ─── Phase 3: Aging Analysis ────────────────────────────────────
      const agingAnalysis = analyzeAging(
        vaultEntries.map((e) => ({
          id: e.id,
          label: e.label,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }))
      );

      // ─── Phase 4: Health Score ──────────────────────────────────────
      const classifications = strengthData.map((s) => s.classification);
      const healthResult = computeHealthScore({
        classifications,
        totalEntries: vaultEntries.length,
        affectedByReuse: reuseResult.totalAffectedEntries,
        agingCompliancePercentage: agingAnalysis.compliancePercentage,
        entriesWithMfa: 0, // Future-ready: no MFA tracking yet
      });

      // ─── Phase 5: Recommendations ──────────────────────────────────
      const weakEntries = strengthData
        .filter((s) => s.classification === 'Weak' || s.classification === 'Fair')
        .map((s) => ({
          id: s.entryId,
          label: s.label,
          entropy: s.entropy,
          classification: s.classification,
        }));

      const allSanctuaryGrade = classifications.every((c) => c === 'Sanctuary Grade');
      const noReuse = reuseResult.reuseGroups.length === 0;
      const allFresh = agingAnalysis.tierCounts.aging === 0 && agingAnalysis.tierCounts.maturing === 0;

      const recResult = generateRecommendations({
        reuseGroups: reuseResult.reuseGroups,
        weakEntries,
        agingEntries: agingAnalysis.agingEntries,
        totalEntries: vaultEntries.length,
        allSanctuaryGrade,
        noReuse,
        allFresh,
      });

      // ─── Commit Results ─────────────────────────────────────────────
      set({
        healthScore: healthResult.score,
        securityLevel: healthResult.level,
        strengthData,
        reuseGroups: reuseResult.reuseGroups,
        agingAnalysis,
        recommendations: recResult.recommendations,
        totalRecommendations: recResult.totalCount,
        isAllClear: recResult.isAllClear,
        allClearMessage: recResult.allClearMessage,
        isStale: false,
        isAnalyzing: false,
        analysisError: null,
        failedEntryIds,
      });
    } catch (err: any) {
      console.error('Audit analysis failed:', err);
      set({
        isAnalyzing: false,
        analysisError: err.message || 'Security analysis encountered an unexpected error.',
      });
    }
  },
}));

// ─── Cross-Store Subscription ─────────────────────────────────────────────────
// Listen to vault store changes and mark audit as stale

let previousEntries: EncryptedVaultEntry[] = [];
let previousIsUnlocked = false;

useVaultStore.subscribe((state) => {
  const auditStore = useAuditStore.getState();

  // If vault was locked, reset audit state
  if (previousIsUnlocked && !state.isUnlocked) {
    auditStore.resetAudit();
  }

  // If entries changed while unlocked, mark stale
  if (state.isUnlocked && state.vaultEntries !== previousEntries) {
    auditStore.markStale();
  }

  previousEntries = state.vaultEntries;
  previousIsUnlocked = state.isUnlocked;
});
