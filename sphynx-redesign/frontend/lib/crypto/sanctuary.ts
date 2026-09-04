import { bufferToBase64, base64ToBuffer } from './vault';

/**
 * Generates a cryptographically random 256-bit Vault Encryption Key (VEK).
 * The VEK is the stable root key that encrypts all vault entries.
 */
export function generateVEK(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Derives the Key Encryption Key (KEK) from the sanctuary phrase using PBKDF2-SHA256.
 * The wallet address is used as the salt — unique per user, never secret.
 *
 * KEK = PBKDF2(password=sanctuaryPhrase, salt=walletAddress, iterations=600000, hash=SHA-256)
 */
export async function deriveKEK(sanctuaryPhrase: string, walletAddress: string): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(sanctuaryPhrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(walletAddress.toLowerCase()),
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — KEK never leaves SubtleCrypto
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedVEKEnvelope {
  encryptedVEK: string; // Base64
  vekIv: string;        // Base64
  vekTag: string;       // Base64
}

/**
 * Encrypts the raw VEK bytes with the KEK using AES-256-GCM.
 * Returns the envelope that is safe to persist on the backend.
 */
export async function encryptVEK(vekBytes: Uint8Array, kek: CryptoKey): Promise<EncryptedVEKEnvelope> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    vekBytes as unknown as ArrayBuffer
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    encryptedVEK: bufferToBase64(ciphertext),
    vekIv: bufferToBase64(iv),
    vekTag: bufferToBase64(tag),
  };
}

/**
 * Decrypts the VEK envelope using the KEK.
 * Returns the raw 32-byte VEK, or throws if the sanctuary phrase is wrong.
 */
export async function decryptVEK(envelope: EncryptedVEKEnvelope, kek: CryptoKey): Promise<Uint8Array> {
  const iv = base64ToBuffer(envelope.vekIv);
  const ciphertext = base64ToBuffer(envelope.encryptedVEK);
  const tag = base64ToBuffer(envelope.vekTag);

  // Reassemble the unified AES-GCM buffer: [ciphertext | tag]
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    kek,
    combined as unknown as ArrayBuffer
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Imports raw VEK bytes as a non-extractable AES-256-GCM CryptoKey
 * ready for vault entry encryption/decryption.
 */
export async function importVEKasCryptoKey(vekBytes: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'raw',
    vekBytes as unknown as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

// --- Sanctuary Phrase Strength Utilities ---

export interface PhraseStrength {
  score: number;       // 0–4
  label: string;
  color: string;
  suggestions: string[];
}

export function evaluatePhraseStrength(phrase: string): PhraseStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (phrase.length >= 16) score++;
  else suggestions.push('Use at least 16 characters');

  if (phrase.length >= 24) score++;
  else if (phrase.length >= 16) suggestions.push('Longer phrases are exponentially stronger');

  if (/[A-Z]/.test(phrase) && /[a-z]/.test(phrase)) score++;
  else suggestions.push('Mix uppercase and lowercase letters');

  if (/[0-9]/.test(phrase) || /[^A-Za-z0-9]/.test(phrase)) score++;
  else suggestions.push('Add numbers or symbols for extra entropy');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  return { score, label: labels[score], color: colors[score], suggestions };
}

const DICEWARE_WORDS = [
  'amber', 'basalt', 'cipher', 'dagger', 'ember', 'falcon', 'glacier',
  'harbor', 'indigo', 'jasper', 'kelvin', 'lantern', 'marble', 'nebula',
  'obsidian', 'phantom', 'quartz', 'raven', 'sphinx', 'temple', 'umbra',
  'vortex', 'warden', 'xenon', 'yonder', 'zenith', 'anchor', 'beacon',
  'cobalt', 'delta', 'eclipse', 'forge', 'granite', 'hollow', 'iron',
  'jungle', 'knight', 'lunar', 'mystic', 'north', 'oracle', 'prism',
];

/**
 * Generates a cryptographically random diceware-style sanctuary phrase suggestion.
 */
export function generateSanctuaryPhrase(wordCount = 5): string {
  const randomIndexes = window.crypto.getRandomValues(new Uint32Array(wordCount));
  return Array.from(randomIndexes)
    .map((n) => DICEWARE_WORDS[n % DICEWARE_WORDS.length])
    .join('-');
}
