import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { api } from '../lib/api/client';
import { deriveVaultKey, encryptEntry, decryptEntry, computeEntryHMAC } from '../lib/crypto/vault';
import {
  generateVEK,
  deriveKEK,
  encryptVEK,
  decryptVEK,
  importVEKasCryptoKey,
  EncryptedVEKEnvelope,
} from '../lib/crypto/sanctuary';
import { exportVaultKeyForExtension } from '../lib/crypto/extensionHandoff';
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
  kIntegrity: CryptoKey | null;
  derivationSignature: string | null;
  extensionKeyMaterial: string | null; // Base64 raw key bytes for extension handoff
  isUnlocked: boolean;
  // Sanctuary / VEK state
  sanctuaryStatus: 'idle' | 'checking' | 'new_user' | 'returning_user' | 'active';
  vaultEntries: EncryptedVaultEntry[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  integrityViolations: Record<string, boolean>;
  activeClipboardTimer: { entryId: string; label: string; duration: number } | null;
  // Sanctuary actions
  checkSanctuaryStatus: () => Promise<void>;
  initializeSanctuary: (sanctuaryPhrase: string) => Promise<void>;
  unlockSanctuary: (sanctuaryPhrase: string) => Promise<void>;
  // Legacy vault actions
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  fetchEntries: () => Promise<void>;
  addEntry: (label: string, username: string, plaintext: string) => Promise<void>;
  editEntry: (id: string, label: string, username: string, plaintext: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  setIntegrityViolation: (id: string, violated: boolean) => void;
  setActiveClipboardTimer: (timer: { entryId: string; label: string; duration: number } | null) => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  kVault: null,
  kIntegrity: null,
  derivationSignature: null,
  extensionKeyMaterial: null,
  isUnlocked: false,
  sanctuaryStatus: 'idle',
  vaultEntries: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  integrityViolations: {},
  activeClipboardTimer: null,

  /**
   * Checks the backend to determine if this wallet has an existing VEK.
   * Sets sanctuaryStatus to 'new_user' or 'returning_user'.
   */
  checkSanctuaryStatus: async () => {
    try {
      set({ sanctuaryStatus: 'checking', error: null });
      const data = await api.get('/vault/vek-status');
      set({ sanctuaryStatus: data.hasVek ? 'returning_user' : 'new_user' });
    } catch (err: any) {
      set({ sanctuaryStatus: 'idle', error: err.message || 'Failed to check sanctuary status.' });
    }
  },

  /**
   * First-time onboarding: generates VEK, derives KEK from sanctuary phrase,
   * encrypts VEK with KEK, persists envelope to backend, then unlocks vault.
   */
  initializeSanctuary: async (sanctuaryPhrase: string) => {
    try {
      set({ isLoading: true, error: null });

      const address = useAuthStore.getState().address;
      if (!address) throw new Error('Wallet address not found. Please log in first.');

      // 1. Generate random 256-bit VEK
      const vekBytes = generateVEK();

      // 2. Derive KEK from sanctuary phrase + wallet address (PBKDF2)
      const kek = await deriveKEK(sanctuaryPhrase, address);

      // 3. Encrypt VEK with KEK (AES-256-GCM)
      const envelope = await encryptVEK(vekBytes, kek);

      // 4. Persist encrypted envelope to backend (zero-knowledge: KEK/VEK never sent)
      await api.post('/vault/vek', envelope);

      // 5. Import VEK as non-extractable CryptoKey for vault operations
      const vekCryptoKey = await importVEKasCryptoKey(vekBytes);

      // 6. Derive kIntegrity via existing HKDF pipeline using VEK as master
      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const derivationSignature = await signer.signMessage('vault-key-derivation-v1');

      const { kVault, kIntegrity } = await deriveVaultKey(
        // Use VEK bytes as hex string as the "master password" for HKDF
        Array.from(vekBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
        address,
        derivationSignature
      );

      // Export key material for extension handoff
      const vekHex = Array.from(vekBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const extKeyMaterial = await exportVaultKeyForExtension(vekHex, address, derivationSignature);

      set({
        kVault,
        kIntegrity,
        derivationSignature,
        extensionKeyMaterial: extKeyMaterial,
        isUnlocked: true,
        sanctuaryStatus: 'active',
        integrityViolations: {},
        error: null,
      });

      await get().fetchEntries();
    } catch (err: any) {
      console.error('Sanctuary initialization failed:', err);
      set({ error: err.message || 'Failed to initialize sanctuary.' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Returning user: fetches encrypted VEK envelope, derives KEK from sanctuary phrase,
   * decrypts VEK, then unlocks vault. Wrong phrase throws AES-GCM decryption error.
   */
  unlockSanctuary: async (sanctuaryPhrase: string) => {
    try {
      set({ isLoading: true, error: null });

      const address = useAuthStore.getState().address;
      if (!address) throw new Error('Wallet address not found. Please log in first.');

      // 1. Fetch encrypted VEK envelope from backend
      const envelope: EncryptedVEKEnvelope = await api.get('/vault/vek');

      // 2. Derive KEK from sanctuary phrase
      const kek = await deriveKEK(sanctuaryPhrase, address);

      // 3. Decrypt VEK — throws if phrase is wrong (GCM auth tag mismatch)
      let vekBytes: Uint8Array;
      try {
        vekBytes = await decryptVEK(envelope, kek);
      } catch {
        throw new Error('Incorrect sanctuary phrase. Your vault could not be unlocked.');
      }

      // 4. Import VEK as non-extractable CryptoKey
      const vekCryptoKey = await importVEKasCryptoKey(vekBytes);

      // 5. Derive kVault + kIntegrity via HKDF
      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const derivationSignature = await signer.signMessage('vault-key-derivation-v1');

      const { kVault, kIntegrity } = await deriveVaultKey(
        Array.from(vekBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
        address,
        derivationSignature
      );

      // Export key material for extension handoff
      const vekHex = Array.from(vekBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const extKeyMaterial = await exportVaultKeyForExtension(vekHex, address, derivationSignature);

      set({
        kVault,
        kIntegrity,
        derivationSignature,
        extensionKeyMaterial: extKeyMaterial,
        isUnlocked: true,
        sanctuaryStatus: 'active',
        integrityViolations: {},
        error: null,
      });

      await get().fetchEntries();
    } catch (err: any) {
      console.error('Sanctuary unlock failed:', err);
      if (err.code === 4001) {
        set({ error: 'Unlock cancelled: Signature request was rejected in MetaMask.' });
      } else {
        set({ error: err.message || 'Failed to unlock sanctuary.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

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
        derivationSignature,
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
   * Wipes all key material and credential lists from client memory.
   */
  lockVault: () => {
    set({
      kVault: null,
      kIntegrity: null,
      derivationSignature: null,
      extensionKeyMaterial: null,
      isUnlocked: false,
      sanctuaryStatus: 'idle',
      vaultEntries: [],
      integrityViolations: {},
      error: null,
      activeClipboardTimer: null,
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
  },

  setActiveClipboardTimer: (timer) => set({ activeClipboardTimer: timer })
}));
