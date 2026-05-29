/**
 * Guardian Recovery Store — Phase 8: Decentralized Recovery
 * 
 * Manages guardian circle state, recovery requests, and approval tracking.
 * Separated from vault and audit stores for clean lifecycle management.
 */

import { create } from 'zustand';
import { api } from '../lib/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Guardian {
  id: string;
  guardianAddress: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
  acceptedAt?: string;
  expiresAt: string;
}

export interface GuardianCircle {
  ownerAddress: string;
  threshold: number;
  totalGuardians: number;
  guardians: Guardian[];
}

export interface RecoveryRequest {
  id: string;
  status: 'pending_cooldown' | 'active' | 'completed' | 'cancelled' | 'expired';
  challengeNonce: string;
  cooldownExpiresAt: string;
  requestExpiresAt: string;
  threshold: number;
  approvalsCollected: number;
  thresholdMet: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  ownerAddress: string;
  eventType: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface GuardianInvitation {
  ownerAddress: string;
  invitationNonce: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface GuardianState {
  // Circle state
  circle: GuardianCircle | null;
  isLoadingCircle: boolean;

  // Recovery state
  recoveryRequest: RecoveryRequest | null;
  hasActiveRequest: boolean;
  isLoadingRecovery: boolean;

  // Invitations (as a guardian)
  myInvitations: GuardianInvitation[];

  // Audit trail
  auditTrail: AuditEvent[];

  // Error state
  error: string | null;

  // Actions
  fetchCircle: () => Promise<void>;
  inviteGuardian: (guardianAddress: string, threshold?: number) => Promise<void>;
  acceptInvitation: (ownerAddress: string, invitationNonce: string, signature: string) => Promise<void>;
  revokeGuardian: (guardianId: string) => Promise<void>;
  distributeShares: (shares: Array<{ guardianId: string; encryptedShare: string; shareIndex: number }>) => Promise<void>;
  fetchMyInvitations: () => Promise<void>;

  // Recovery actions
  createRecoveryRequest: () => Promise<void>;
  cancelRecovery: () => Promise<void>;
  fetchRecoveryStatus: () => Promise<void>;
  completeRecovery: (encryptedVEK: string, vekIv: string, vekTag: string) => Promise<void>;
  fetchRecoveryShares: () => Promise<any[]>;
  fetchAuditTrail: () => Promise<void>;

  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  circle: null as GuardianCircle | null,
  isLoadingCircle: false,
  recoveryRequest: null as RecoveryRequest | null,
  hasActiveRequest: false,
  isLoadingRecovery: false,
  myInvitations: [] as GuardianInvitation[],
  auditTrail: [] as AuditEvent[],
  error: null as string | null,
};

export const useGuardianStore = create<GuardianState>((set, get) => ({
  ...INITIAL_STATE,

  setError: (error) => set({ error }),

  reset: () => set({ ...INITIAL_STATE }),

  // ─── Circle Management ───────────────────────────────────────────────

  fetchCircle: async () => {
    try {
      set({ isLoadingCircle: true, error: null });
      const data = await api.get('/guardians/circle');
      set({ circle: data, isLoadingCircle: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingCircle: false });
    }
  },

  inviteGuardian: async (guardianAddress: string, threshold?: number) => {
    try {
      set({ error: null });
      await api.post('/guardians/invite', { guardianAddress, threshold });
      await get().fetchCircle();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  acceptInvitation: async (ownerAddress: string, invitationNonce: string, signature: string) => {
    try {
      set({ error: null });
      await api.post('/guardians/accept', { ownerAddress, invitationNonce, signature });
      await get().fetchMyInvitations();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  revokeGuardian: async (guardianId: string) => {
    try {
      set({ error: null });
      await api.delete(`/guardians/${guardianId}`);
      await get().fetchCircle();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  distributeShares: async (shares) => {
    try {
      set({ error: null });
      await api.post('/guardians/distribute-shares', { shares });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchMyInvitations: async () => {
    try {
      const data = await api.get('/guardians/invitations');
      set({ myInvitations: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ─── Recovery Management ─────────────────────────────────────────────

  createRecoveryRequest: async () => {
    try {
      set({ isLoadingRecovery: true, error: null });
      const data = await api.post('/recovery/request');
      set({
        recoveryRequest: data.request,
        hasActiveRequest: true,
        isLoadingRecovery: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoadingRecovery: false });
      throw err;
    }
  },

  cancelRecovery: async () => {
    try {
      set({ error: null });
      await api.post('/recovery/cancel');
      set({ recoveryRequest: null, hasActiveRequest: false });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchRecoveryStatus: async () => {
    try {
      set({ isLoadingRecovery: true, error: null });
      const data = await api.get('/recovery/status');
      set({
        recoveryRequest: data.request || null,
        hasActiveRequest: data.hasActiveRequest,
        isLoadingRecovery: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoadingRecovery: false });
    }
  },

  completeRecovery: async (encryptedVEK: string, vekIv: string, vekTag: string) => {
    try {
      set({ isLoadingRecovery: true, error: null });
      await api.post('/recovery/complete', { encryptedVEK, vekIv, vekTag });
      set({ recoveryRequest: null, hasActiveRequest: false, isLoadingRecovery: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingRecovery: false });
      throw err;
    }
  },

  fetchRecoveryShares: async () => {
    try {
      const data = await api.get('/recovery/shares');
      return data.shares || [];
    } catch (err: any) {
      set({ error: err.message });
      return [];
    }
  },

  fetchAuditTrail: async () => {
    try {
      const data = await api.get('/recovery/audit');
      set({ auditTrail: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
