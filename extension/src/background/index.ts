import { decryptEntry, deriveVaultKey } from '../lib/crypto';
import { encryptCredential } from '../lib/encrypt';
import { normalizeDomain, isDuplicate } from '../lib/domain';
import { isDomainIgnored, addIgnoredDomain } from '../lib/ignorelist';
import { getSettings } from '../lib/settings';
import { initAutoLock, resetAutoLockTimer, stopAutoLockTimer } from '../lib/autolock';
import { recordUsage, getRecentCredentials } from '../lib/activity';
import { CONFIG } from '../lib/config';
import { EncryptedVaultEntry, ExtensionSession } from '../types';

// In-memory key caches (never persisted to storage)
let kVault: CryptoKey | null = null;
let kIntegrity: CryptoKey | null = null;

// API base URL from config
const BASE_URL = CONFIG.API_URL;

// ============================================================
// SESSION MANAGEMENT
// ============================================================

async function getSession(): Promise<ExtensionSession> {
  const data = await chrome.storage.session.get(['address', 'derivationSignature', 'token', 'isUnlocked']);
  return {
    address: data.address || null,
    derivationSignature: data.derivationSignature || null,
    token: data.token || null,
    isUnlocked: !!data.isUnlocked && !!kVault
  };
}

async function saveSession(session: Partial<ExtensionSession>) {
  await chrome.storage.session.set(session);
}

async function clearSession() {
  kVault = null;
  kIntegrity = null;
  stopAutoLockTimer();
  await chrome.storage.session.remove(['address', 'derivationSignature', 'token', 'isUnlocked']);
  console.log('[Sphynx] Session locked and keys cleared from memory.');
}

// Initialize auto-lock with clearSession as the lock callback
initAutoLock(clearSession);

// ============================================================
// API HELPERS WITH ERROR RESILIENCE
// ============================================================

async function apiGet(path: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) await clearSession();
      throw new Error(`API Error ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function apiPost(path: string, token: string, body: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${BASE_URL}${path}`;
    console.log('[Sphynx BG] API POST:', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) await clearSession();
      const errMsg = responseBody?.error || `API Error ${res.status}`;
      console.error('[Sphynx BG] API POST failed:', res.status, errMsg);
      throw new Error(errMsg);
    }
    return responseBody;
  } finally {
    clearTimeout(timeout);
  }
}

async function apiPut(path: string, token: string, body: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) await clearSession();
      throw new Error(`API Error ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// EXTERNAL MESSAGES (from web app)
// ============================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[Sphynx BG] External message received from:', sender.url, 'type:', message?.type);

  if (!sender.url || !sender.url.startsWith(CONFIG.WEB_APP_URL)) {
    console.warn('[Sphynx BG] Rejected: unauthorized origin', sender.url);
    sendResponse({ success: false, error: 'Unauthorized sender origin.' });
    return;
  }

  if (message.type === 'SYNC_SESSION') {
    const { address, derivationSignature, token } = message.payload;
    console.log('[Sphynx BG] SYNC_SESSION payload:', { address, hasSignature: !!derivationSignature, hasToken: !!token });

    if (!address || !token) {
      sendResponse({ success: false, error: 'Missing address or token.' });
      return;
    }

    saveSession({
      address: address.toLowerCase(),
      derivationSignature: derivationSignature || '',
      token,
      isUnlocked: false
    }).then(() => {
      kVault = null;
      kIntegrity = null;
      console.log('[Sphynx BG] Session stored successfully for:', address);
      sendResponse({ success: true, message: 'Session metadata synchronized.' });
    }).catch(err => {
      console.error('[Sphynx BG] Session store failed:', err);
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

// ============================================================
// INTERNAL MESSAGES (popup & content scripts)
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message.type;

  // Reset auto-lock timer on any activity
  if (kVault) {
    resetAutoLockTimer();
  }

  // --- SYNC_SESSION_INTERNAL (relayed from content script on localhost:3000) ---
  if (type === 'SYNC_SESSION_INTERNAL') {
    const { address, derivationSignature, token } = message.payload;
    console.log('[Sphynx BG] SYNC_SESSION_INTERNAL received:', { address, hasSignature: !!derivationSignature, hasToken: !!token });

    if (!address || !token) {
      sendResponse({ success: false, error: 'Missing address or token.' });
      return true;
    }

    saveSession({
      address: address.toLowerCase(),
      derivationSignature: derivationSignature || '',
      token,
      isUnlocked: false
    }).then(() => {
      kVault = null;
      kIntegrity = null;
      console.log('[Sphynx BG] Session stored via internal relay for:', address);
      sendResponse({ success: true, message: 'Session synchronized.' });
    }).catch(err => {
      console.error('[Sphynx BG] Internal sync failed:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- STORE_PENDING_CREDENTIAL (from content script) ---
  if (type === 'STORE_PENDING_CREDENTIAL') {
    chrome.storage.session.set({ sphynx_pending_credential: message.payload }, () => {
      console.log('[Sphynx BG] Pending credential stored');
      sendResponse({ success: true });
    });
    return true;
  }

  // --- GET_PENDING_CREDENTIAL (from content script on new page) ---
  if (type === 'GET_PENDING_CREDENTIAL') {
    chrome.storage.session.get('sphynx_pending_credential', (data) => {
      const pending = data.sphynx_pending_credential || null;
      // Clear it after retrieval (one-shot)
      if (pending) {
        chrome.storage.session.remove('sphynx_pending_credential');
        console.log('[Sphynx BG] Pending credential retrieved and cleared');
      }
      sendResponse({ success: true, data: pending });
    });
    return true;
  }

  // --- GET_VAULT_STATUS ---
  if (type === 'GET_VAULT_STATUS') {
    getSession().then((session) => {
      sendResponse({ success: true, data: { address: session.address, isUnlocked: session.isUnlocked } });
    });
    return true;
  }

  // --- UNLOCK_VAULT ---
  if (type === 'UNLOCK_VAULT') {
    const { masterPassword } = message.payload;
    getSession().then(async (session) => {
      if (!session.address || !session.derivationSignature) {
        throw new Error('No active wallet session synced. Please open the Sphynx site and connect your wallet.');
      }

      const keys = await deriveVaultKey(masterPassword, session.address, session.derivationSignature);
      kVault = keys.kVault;
      kIntegrity = keys.kIntegrity;

      await saveSession({ isUnlocked: true });
      await resetAutoLockTimer();
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message || 'Key derivation failed.' });
    });
    return true;
  }

  // --- LOCK_VAULT ---
  if (type === 'LOCK_VAULT') {
    clearSession().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // --- GET_ENTRIES ---
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
          decrypted.push({ id: entry.id, label: entry.label, username: entry.username, url: entry.url, plaintext });
        } catch {
          decrypted.push({ id: entry.id, label: entry.label, username: entry.username, url: entry.url, plaintext: '[Decryption Error]' });
        }
      }

      sendResponse({ success: true, data: decrypted });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- GET_CREDENTIALS (autofill) ---
  if (type === 'GET_CREDENTIALS') {
    const { entryId, hostname } = message.payload;

    if (!sender.tab) {
      sendResponse({ success: false, error: 'Request denied.' });
      return;
    }

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        throw new Error('Vault is locked.');
      }

      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      const entry = encryptedEntries.find(e => e.id === entryId);
      if (!entry) throw new Error('Entry not found.');

      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      // Track activity
      await recordUsage(entry.id, entry.label);

      sendResponse({ success: true, data: { username: entry.username, password: plaintext } });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- CHECK_SAVE_CREDENTIAL ---
  if (type === 'CHECK_SAVE_CREDENTIAL') {
    const { hostname, username } = message.payload;

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) {
        sendResponse({ success: false, error: 'Vault is locked.' });
        return;
      }

      const domain = normalizeDomain(hostname);
      const ignored = await isDomainIgnored(domain);
      if (ignored) {
        sendResponse({ success: true, data: { action: 'ignored' } });
        return;
      }

      const encryptedEntries: EncryptedVaultEntry[] = await apiGet('/vault/list', session.token);
      const entries = encryptedEntries.map(e => ({ id: e.id, label: e.label, username: e.username, url: e.url }));
      const duplicateCheck = isDuplicate(entries, hostname, username);

      if (duplicateCheck.isDuplicate) {
        const existingEntry = encryptedEntries.find(e => e.username.toLowerCase().trim() === username.toLowerCase().trim());
        sendResponse({ success: true, data: { action: 'update', existingEntryId: existingEntry?.id, existingLabel: existingEntry?.label } });
      } else {
        sendResponse({ success: true, data: { action: 'save' } });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- SAVE_CREDENTIAL ---
  if (type === 'SAVE_CREDENTIAL') {
    const { hostname, username, password, label } = message.payload;
    console.log('[Sphynx BG] SAVE_CREDENTIAL received:', { hostname, username, password_length: password?.length });

    getSession().then(async (session) => {
      console.log('[Sphynx BG] Session state: address=', session.address, 'token=', !!session.token, 'kVault=', !!kVault, 'isUnlocked=', session.isUnlocked);

      if (!kVault || !session.token) {
        throw new Error('Vault is locked. Please unlock the extension first, then try saving again.');
      }

      console.log('[Sphynx BG] Encrypting credential...');
      const { ciphertext, iv, tag } = await encryptCredential(password, kVault);
      console.log('[Sphynx BG] Encryption OK — ciphertext:', ciphertext.length, 'chars, iv:', iv.length, 'chars, tag:', tag.length, 'chars');

      const credLabel = label || normalizeDomain(hostname);
      const body = { label: credLabel, username: username || '', ciphertext, iv, tag };
      console.log('[Sphynx BG] POST /vault/add —', JSON.stringify({ label: credLabel, username: username || '', bodySize: JSON.stringify(body).length }));

      const result = await apiPost('/vault/add', session.token, body);
      console.log('[Sphynx BG] API response:', JSON.stringify(result));
      console.log('[Sphynx BG] ✓ Credential saved successfully');

      sendResponse({ success: true, message: 'Credential saved.' });
    }).catch((err) => {
      console.error('[Sphynx BG] SAVE_CREDENTIAL FAILED:', err.message);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- UPDATE_CREDENTIAL ---
  if (type === 'UPDATE_CREDENTIAL') {
    const { entryId, password, label, username } = message.payload;

    getSession().then(async (session) => {
      if (!session.isUnlocked || !kVault || !session.token) throw new Error('Vault is locked.');

      const { ciphertext, iv, tag } = await encryptCredential(password, kVault);
      await apiPut(`/vault/${entryId}`, session.token, {
        label: label || 'Updated',
        username: username || '',
        ciphertext, iv, tag
      });

      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- IGNORE_DOMAIN ---
  if (type === 'IGNORE_DOMAIN') {
    const { hostname } = message.payload;
    addIgnoredDomain(normalizeDomain(hostname)).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // --- GET_SETTINGS ---
  if (type === 'GET_SETTINGS') {
    getSettings().then((settings) => {
      sendResponse({ success: true, data: settings });
    });
    return true;
  }

  // --- SAVE_SETTINGS ---
  if (type === 'SAVE_SETTINGS') {
    const { settings } = message.payload;
    import('../lib/settings').then(async ({ saveSettings }) => {
      const updated = await saveSettings(settings);
      // Re-apply auto-lock timer with new settings
      if (kVault) await resetAutoLockTimer();
      sendResponse({ success: true, data: updated });
    });
    return true;
  }

  // --- GET_RECENT_ACTIVITY ---
  if (type === 'GET_RECENT_ACTIVITY') {
    getRecentCredentials().then((records) => {
      sendResponse({ success: true, data: records });
    });
    return true;
  }

  // --- GET_IGNORED_DOMAINS ---
  if (type === 'GET_IGNORED_DOMAINS') {
    import('../lib/ignorelist').then(async ({ getIgnoredDomains }) => {
      const domains = await getIgnoredDomains();
      sendResponse({ success: true, data: domains });
    });
    return true;
  }

  // --- REMOVE_IGNORED_DOMAIN ---
  if (type === 'REMOVE_IGNORED_DOMAIN') {
    const { domain } = message.payload;
    import('../lib/ignorelist').then(async ({ removeIgnoredDomain }) => {
      await removeIgnoredDomain(domain);
      sendResponse({ success: true });
    });
    return true;
  }
});
