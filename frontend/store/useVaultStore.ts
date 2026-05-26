import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { api } from '../lib/api/client';
import { deriveVaultKey, encryptEntry, decryptEntry, computeEntryHMAC } from '../lib/crypto/vault';
import { ethers } from 'ethers';

export interface EncryptedVaultEntry {
  id: string;
  label: string;
  username: string;
  iv: string;         // Base64
  ciphertext: string; // Base64
  tag: string;        // Base64
  checksum?: string;  // Base64 HMAC
  createdAt: string;
  updatedAt: string;
}

interface VaultState {
  kVault: CryptoKey | null;
  kIntegrity: CryptoKey | null; // Non-extractable HMAC key
  isUnlocked: boolean;
  vaultEntries: EncryptedVaultEntry[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  integrityViolations: Record<string, boolean>; // Tamper indicators mapping entryId -> true
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  fetchEntries: () => Promise<void>;
  addEntry: (label: string, username: string, plaintext: string) => Promise<void>;
  editEntry: (id: string, label: string, username: string, plaintext: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  setIntegrityViolation: (id: string, violated: boolean) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  kVault: null,
  kIntegrity: null,
  isUnlocked: false,
  vaultEntries: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  integrityViolations: {},

  /**
   * Prompts wallet signature derivation, derives both kVault and kIntegrity via HKDF,
   * unlocks the session, and fetches the encrypted credentials list.
   */
  unlockVault: async (masterPassword: string) => {
    try {
      set({ isLoading: true, error: null });

      const address = useAuthStore.getState().address;
      if (!address) {
        throw new Error('Authentication wallet address not found. Please log in first.');
      }

      // Check for MetaMask provider existence
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('MetaMask is not installed. Active Web3 signature is required to unlock.');
      }

      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      
      // Request deterministic signature from user
      const signer = await provider.getSigner();
      const derivationMessage = 'vault-key-derivation-v1';
      const derivationSignature = await signer.signMessage(derivationMessage);

      // Cryptographically derive dual keys (kVault and kIntegrity)
      const { kVault, kIntegrity } = await deriveVaultKey(masterPassword, address, derivationSignature);

      set({
        kVault,
        kIntegrity,
        isUnlocked: true,
        integrityViolations: {}, // Reset any violation states
        error: null
      });

      // Automatically fetch the user's encrypted vault entries
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Vault Unlock failed:', err);
      if (err.code === 4001) {
        set({ error: 'Vault unlock cancelled: Signature request was rejected in MetaMask.' });
      } else {
        set({ error: err.message || 'An error occurred while deriving the vault keys.' });
      }
      get().lockVault(); // Ensure state remains completely wiped on failure
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Wipes kVault, kIntegrity, and all credential lists immediately from client memory.
   */
  lockVault: () => {
    set({
      kVault: null,
      kIntegrity: null,
      isUnlocked: false,
      vaultEntries: [],
      integrityViolations: {},
      error: null
    });
  },

  /**
   * Fetches encrypted blobs from backend storage.
   */
  fetchEntries: async () => {
    try {
      set({ isLoading: true, error: null });
      const entries = await api.get('/vault/list');
      set({ vaultEntries: entries });
    } catch (err: any) {
      console.error('Failed to fetch vault entries:', err);
      set({ error: err.message || 'Failed to retrieve encrypted vault.' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Performs client-side GCM encryption and signs payload with HMAC before posting to backend.
   */
  addEntry: async (label: string, username: string, plaintext: string) => {
    try {
      set({ isLoading: true, error: null });
      const { kVault, kIntegrity } = get();

      if (!kVault || !kIntegrity) {
        throw new Error('Vault is locked. Cannot encrypt or sign secret.');
      }

      // 1. Encrypt secret locally before transmission
      const encrypted = await encryptEntry(plaintext, kVault);

      // 2. Compute cryptographically secure HMAC checksum for integrity verification
      const checksum = await computeEntryHMAC(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
        label,
        username,
        kIntegrity
      );

      // 3. Post encrypted payload with checksum to Express Backend
      await api.post('/vault/add', {
        label,
        username,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        checksum
      });

      // 4. Refresh encrypted list
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Failed to encrypt/add secret:', err);
      set({ error: err.message || 'Failed to encrypt and store secret.' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Deletes a credential entry by ID.
   */
  deleteEntry: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.delete(`/vault/${id}`);
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Failed to purge secret:', err);
      set({ error: err.message || 'Failed to delete vault entry.' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Performs client-side encryption and posts the updated envelope with HMAC to the backend.
   */
  editEntry: async (id: string, label: string, username: string, plaintext: string) => {
    try {
      set({ isLoading: true, error: null });
      const { kVault, kIntegrity } = get();

      if (!kVault || !kIntegrity) {
        throw new Error('Vault is locked. Cannot encrypt or sign secret.');
      }

      // 1. Encrypt secret locally before transmission
      const encrypted = await encryptEntry(plaintext, kVault);

      // 2. Compute fresh HMAC-SHA256 checksum over updated components
      const checksum = await computeEntryHMAC(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
        label,
        username,
        kIntegrity
      );

      // 3. Put encrypted payload to Express Backend
      await api.put(`/vault/${id}`, {
        label,
        username,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        checksum
      });

      // 4. Refresh encrypted list
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Failed to encrypt/edit secret:', err);
      set({ error: err.message || 'Failed to encrypt and update secret.' });
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setError: (error) => set({ error }),

  setIntegrityViolation: (id, violated) => {
    set((state) => ({
      integrityViolations: {
        ...state.integrityViolations,
        [id]: violated
      }
    }));
  }
}));
