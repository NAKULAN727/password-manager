export interface EncryptedVaultEntry {
  id: string;
  label: string;
  username: string;
  url?: string;
  iv: string;         // Base64
  ciphertext: string; // Base64
  tag: string;        // Base64
  checksum?: string;  // Base64 HMAC
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedVaultEntry {
  id: string;
  label: string;
  username: string;
  url?: string;
  plaintext: string; // Plaintext password/secret
}

export interface ExtensionSession {
  address: string | null;
  derivationSignature: string | null;
  token: string | null;
  isUnlocked: boolean;
}

export type ExtensionMessage =
  | { type: 'SYNC_SESSION'; payload: { address: string; derivationSignature: string; token: string } }
  | { type: 'GET_VAULT_STATUS' }
  | { type: 'UNLOCK_VAULT'; payload: { masterPassword: string } }
  | { type: 'LOCK_VAULT' }
  | { type: 'GET_ENTRIES' }
  | { type: 'GET_CREDENTIALS'; payload: { entryId: string; hostname: string } }
  | { type: 'CHECK_SAVE_CREDENTIAL'; payload: { hostname: string; username: string } }
  | { type: 'SAVE_CREDENTIAL'; payload: { hostname: string; username: string; password: string; label?: string } }
  | { type: 'UPDATE_CREDENTIAL'; payload: { entryId: string; password: string } }
  | { type: 'IGNORE_DOMAIN'; payload: { hostname: string } }
  | { type: 'FILL_ACTIVE_TAB'; entryId: string }
  | { type: 'DETECTED_FORM_LOGIN'; payload: { hasLoginForm: boolean } }
  | { type: 'REQUEST_AUTOFILL'; payload: { entryId: string } };

export type ExtensionResponse =
  | { success: true; data?: any; message?: string }
  | { success: false; error: string };
