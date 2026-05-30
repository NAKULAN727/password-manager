import { bufferToBase64 } from './crypto';

/**
 * Encrypts a plaintext password using the derived kVault (AES-256-GCM).
 * Returns base64-encoded ciphertext and IV for storage.
 * Plaintext never leaves the local context.
 */
export async function encryptCredential(
  plaintext: string,
  kVault: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const subtle = crypto.subtle;

  // Generate a unique 12-byte IV for this entry
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt using AES-256-GCM
  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    kVault,
    enc.encode(plaintext)
  );

  // The Web Crypto API appends the 16-byte auth tag to the ciphertext
  // We store the full buffer as ciphertext (includes tag)
  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}
