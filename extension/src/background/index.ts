import { decryptEntry, deriveVaultKey } from '../lib/crypto';
import { encryptCredential } from '../lib/encrypt';
import { normalizeDomain, isDuplicate } from '../lib/domain';
import { isDomainIgnored, addIgnoredDomain } from '../lib/ignorelist';
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
 * API POST caller
 */
async function apiPost(path: string, token: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
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
 * API PUT caller
 */
async function apiPut(path: string, token: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
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
      isUnlocked: false
    }).then(() => {
      kVault = null;
      kIntegrity = null;
      sendResponse({ success: true, message: 'Session metadata synchronized.' });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
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

      const decrypted = [];
      for (const entry of encryptedEntries) {
        try {
          const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
          decrypted.push({
            id: entry.id,
            label: entry.label,
            username: entry.username,
            url: entry.url,
            plaintext
          });
        } catch (decErr) {
          console.error('Decryption failed for entry ID:', entry.id, decErr);
          decrypted.push({
            id: entry.id,
            label: entry.label,
            username: entry.username,
            url: entry.url,
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

    if (!sender.tab) {
      sendResponse({ success: false, error: 'Request denied: Caller is not a content page.' });
      return;
    }

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Sphynx Vault is locked. Unlock the extension to autofill.');
      }

      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      const entry = encryptedEntries.find(e => e.id === entryId);

      if (!entry) {
        throw new Error('Requested vault entry not found.');
      }

      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      sendResponse({
        success: true,
        data: { username: entry.username, password: plaintext }
      });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // 6. CHECK_SAVE_CREDENTIAL — Check if we should show save prompt
  if (type === 'CHECK_SAVE_CREDENTIAL') {
    const { hostname, username } = message.payload;

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        sendResponse({ success: false, error: 'Vault is locked.' });
        return;
      }

      // Check ignore list
      const domain = normalizeDomain(hostname);
      const ignored = await isDomainIgnored(domain);
      if (ignored) {
        sendResponse({ success: true, data: { action: 'ignored' } });
        return;
      }

      // Fetch existing entries to check for duplicates
      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      const entries = encryptedEntries.map(e => ({
        id: e.id,
        label: e.label,
        username: e.username,
        url: e.url
      }));

      const duplicateCheck = isDuplicate(entries, hostname, username);

      if (duplicateCheck.isDuplicate) {
        // Find the entry ID for update
        const existingEntry = encryptedEntries.find(e =>
          e.username.toLowerCase().trim() === username.toLowerCase().trim()
        );
        sendResponse({
          success: true,
          data: {
            action: 'update',
            existingEntryId: existingEntry?.id,
            existingLabel: existingEntry?.label
          }
        });
      } else {
        sendResponse({ success: true, data: { action: 'save' } });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // 7. SAVE_CREDENTIAL — Encrypt and save a new credential
  if (type === 'SAVE_CREDENTIAL') {
    const { hostname, username, password, label } = message.payload;

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Vault is locked. Cannot save credential.');
      }

      // Encrypt the password locally
      const { ciphertext, iv } = await encryptCredential(password, kVault);

      // Determine label
      const credLabel = label || normalizeDomain(hostname);

      // Send encrypted payload to backend
      await apiPost('/vault/entries', session.token, {
        label: credLabel,
        username: username,
        encryptedPassword: ciphertext,
        iv: iv,
        url: hostname
      });

      console.log(`[Sphynx] Credential saved for ${credLabel} (${username})`);
      sendResponse({ success: true });
    }).catch((err) => {
      console.error('[Sphynx] Save credential failed:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // 8. UPDATE_CREDENTIAL — Encrypt and update an existing credential
  if (type === 'UPDATE_CREDENTIAL') {
    const { entryId, password } = message.payload;

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Vault is locked. Cannot update credential.');
      }

      // Encrypt the new password locally
      const { ciphertext, iv } = await encryptCredential(password, kVault);

      // Update via API
      await apiPut(`/vault/entries/${entryId}`, session.token, {
        encryptedPassword: ciphertext,
        iv: iv
      });

      console.log(`[Sphynx] Credential updated for entry ${entryId}`);
      sendResponse({ success: true });
    }).catch((err) => {
      console.error('[Sphynx] Update credential failed:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // 9. IGNORE_DOMAIN — Add domain to never-save list
  if (type === 'IGNORE_DOMAIN') {
    const { hostname } = message.payload;
    const domain = normalizeDomain(hostname);
    addIgnoredDomain(domain).then(() => {
      console.log(`[Sphynx] Domain ignored: ${domain}`);
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});
