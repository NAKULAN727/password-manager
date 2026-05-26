import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { api } from '../lib/api/client';
import { deriveVaultKey, encryptEntry, decryptEntry } from '../lib/crypto/vault';
import { ethers } from 'ethers';

export interface EncryptedVaultEntry {
  id: string;
  label: string;
  username: string;
  iv: string;         // Base64
  ciphertext: string; // Base64
  tag: string;        // Base64
  createdAt: string;
  updatedAt: string;
}

interface VaultState {
  kVault: CryptoKey | null;
  isUnlocked: boolean;
  vaultEntries: EncryptedVaultEntry[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  fetchEntries: () => Promise<void>;
  addEntry: (label: string, username: string, plaintext: string) => Promise<void>;
  editEntry: (id: string, label: string, username: string, plaintext: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  kVault: null,
  isUnlocked: false,
  vaultEntries: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  /**
   * Prompts wallet signature derivation, derives the K_vault CryptoKey,
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
      
      // 1. Request deterministic key derivation signature from user
      const signer = await provider.getSigner();
      
      // Fixed deterministic message - never changes, never sent to backend
      const derivationMessage = 'vault-key-derivation-v1';
      const derivationSignature = await signer.signMessage(derivationMessage);

      // 2. Cryptographically derive final AES-256-GCM CryptoKey
      const kVault = await deriveVaultKey(masterPassword, address, derivationSignature);

      set({
        kVault,
        isUnlocked: true,
        error: null
      });

      // 3. Automatically fetch the user's encrypted vault entries
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Vault Unlock failed:', err);
      if (err.code === 4001) {
        set({ error: 'Vault unlock cancelled: Signature request was rejected in MetaMask.' });
      } else {
        set({ error: err.message || 'An error occurred while deriving the vault key.' });
      }
      get().lockVault(); // Ensure state remains completely wiped on failure
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Wipes K_vault and all credential lists immediately from client memory.
   */
  lockVault: () => {
    set({
      kVault: null,
      isUnlocked: false,
      vaultEntries: [],
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
   * Performs client-side GCM encryption and posts the resulting blob to backend.
   */
  addEntry: async (label: string, username: string, plaintext: string) => {
    try {
      set({ isLoading: true, error: null });
      const { kVault } = get();

      if (!kVault) {
        throw new Error('Vault is locked. Cannot encrypt secret.');
      }

      // 1. Encrypt secret locally before transmission
      const encrypted = await encryptEntry(plaintext, kVault);

      // 2. Post encrypted payload to Express Backend
      await api.post('/vault/add', {
        label,
        username,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag
      });

      // 3. Refresh encrypted list
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
      
      // Dispatch DELETE request to Express API matching DELETE /vault/:id
      await api.delete(`/vault/${id}`);

      // Refresh list
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Failed to purge secret:', err);
      set({ error: err.message || 'Failed to delete vault entry.' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Performs client-side encryption and posts the updated envelope to the backend.
   */
  editEntry: async (id: string, label: string, username: string, plaintext: string) => {
    try {
      set({ isLoading: true, error: null });
      const { kVault } = get();

      if (!kVault) {
        throw new Error('Vault is locked. Cannot encrypt secret.');
      }

      // 1. Encrypt secret locally before transmission
      const encrypted = await encryptEntry(plaintext, kVault);

      // 2. Put encrypted payload to Express Backend matching PUT /vault/:id
      await api.put(`/vault/${id}`, {
        label,
        username,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag
      });

      // 3. Refresh encrypted list
      await get().fetchEntries();
    } catch (err: any) {
      console.error('Failed to encrypt/edit secret:', err);
      set({ error: err.message || 'Failed to encrypt and update secret.' });
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setError: (error) => set({ error })
}));
