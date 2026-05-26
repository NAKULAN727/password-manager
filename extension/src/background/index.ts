import { decryptEntry, deriveVaultKey } from '../lib/crypto';
import { EncryptedVaultEntry, ExtensionSession } from '../types';

// In-memory key caches (never persisted to storage)
let kVault: CryptoKey | null = null;
let kIntegrity: CryptoKey | null = null;

// Target API endpoint
const BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to fetch session configuration safely from memory storage
 */
async function getSession(): Promise<ExtensionSession> {
  const data = await chrome.storage.session.get(['address', 'derivationSignature', 'token', 'isUnlocked']);
  return {
    address: data.address || null,
    derivationSignature: data.derivationSignature || null,
    token: data.token || null,
    isUnlocked: !!data.isUnlocked && !!kVault
  };
}

/**
 * Save session state to session-only storage (in-memory)
 */
async function saveSession(session: Partial<ExtensionSession>) {
  await chrome.storage.session.set(session);
}

/**
 * Completely wipe cryptographic keys and session parameters
 */
async function clearSession() {
  kVault = null;
  kIntegrity = null;
  await chrome.storage.session.remove(['address', 'derivationSignature', 'token', 'isUnlocked']);
  console.log('Sphynx session locked and keys cleared from memory.');
}

/**
 * Core API caller using the JWT token in memory
 */
async function apiGet(path: string, token: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      await clearSession();
    }
    throw new Error(`API Error ${res.status}: Request failed.`);
  }
  return res.json();
}

/**
 * Handle incoming external sync requests from Next.js Frontend
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received external message from:', sender.url, message);
  
  // Validate sender URL
  if (!sender.url || !sender.url.startsWith('http://localhost:3000')) {
    sendResponse({ success: false, error: 'Unauthorized sender origin.' });
    return;
  }

  if (message.type === 'SYNC_SESSION') {
    const { address, derivationSignature, token } = message.payload;
    if (!address || !derivationSignature || !token) {
      sendResponse({ success: false, error: 'Invalid payload elements.' });
      return;
    }

    saveSession({
      address: address.toLowerCase(),
      derivationSignature,
      token,
      isUnlocked: false // Locked until master password is typed in popup
    }).then(() => {
      // Clear key caches because new credentials are being synchronized
      kVault = null;
      kIntegrity = null;
      sendResponse({ success: true, message: 'Session metadata synchronized.' });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'LOCK_VAULT') {
    clearSession().then(() => {
      sendResponse({ success: true, message: 'Vault locked successfully.' });
    });
    return true;
  }
});

/**
 * Handle internal messaging (Popup & Content Script requests)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message.type;

  // 1. GET_VAULT_STATUS
  if (type === 'GET_VAULT_STATUS') {
    getSession().then((session) => {
      sendResponse({ success: true, data: { address: session.address, isUnlocked: session.isUnlocked } });
    });
    return true;
  }

  // 2. UNLOCK_VAULT
  if (type === 'UNLOCK_VAULT') {
    const { masterPassword } = message.payload;
    getSession().then(async (session) => {
      if (!session.address || !session.derivationSignature) {
        throw new Error('No active wallet session synced. Please open the Sphynx site and connect your wallet.');
      }

      console.log('Deriving keys for address:', session.address);
      const keys = await deriveVaultKey(masterPassword, session.address, session.derivationSignature);
      kVault = keys.kVault;
      kIntegrity = keys.kIntegrity;

      await saveSession({ isUnlocked: true });
      sendResponse({ success: true });
    }).catch((err) => {
      console.error('Extension unlock failure:', err);
      sendResponse({ success: false, error: err.message || 'Key derivation failed.' });
    });
    return true;
  }

  // 3. LOCK_VAULT
  if (type === 'LOCK_VAULT') {
    clearSession().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // 4. GET_ENTRIES (decrypted only in extension context)
  if (type === 'GET_ENTRIES') {
    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Vault is locked. Cannot retrieve credentials.');
      }

      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      
      // Decrypt entries locally inside secure background environment
      const decrypted = [];
      for (const entry of encryptedEntries) {
        try {
          const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
          decrypted.push({
            id: entry.id,
            label: entry.label,
            username: entry.username,
            plaintext
          });
        } catch (decErr) {
          console.error('Decryption failed for entry ID:', entry.id, decErr);
          // Return placeholder on decryption failure
          decrypted.push({
            id: entry.id,
            label: entry.label,
            username: entry.username,
            plaintext: 'Decryption Error (Incorrect Key/Tampered)'
          });
        }
      }

      sendResponse({ success: true, data: decrypted });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // 5. GET_CREDENTIALS (called by Content Script for autofill)
  if (type === 'GET_CREDENTIALS') {
    const { entryId, hostname } = message.payload;
    
    // Check script permissions & validate sender is valid tab/frame
    if (!sender.tab) {
      sendResponse({ success: false, error: 'Request denied: Caller is not a content page.' });
      return;
    }

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Sphynx Vault is locked. Unlock the extension to autofill.');
      }

      // Fetch encrypted list from server
      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      const entry = encryptedEntries.find(e => e.id === entryId);

      if (!entry) {
        throw new Error('Requested vault entry not found.');
      }

      // Decrypt locally inside background context
      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      console.log(`Providing credentials for entry ${entry.label} to tab ${sender.tab?.id} matching host ${hostname}`);
      
      sendResponse({
        success: true,
        data: {
          username: entry.username,
          password: plaintext
        }
      });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});
