import { bufferToBase64 } from './crypto';

/**
 * Encrypts a plaintext password using the derived kVault (AES-256-GCM).
 * Returns base64-encoded ciphertext, IV, and auth tag separately
 * (matching the backend's expected schema: { ciphertext, iv, tag }).
 */
export async function encryptCredential(
  plaintext: string,
  kVault: CryptoKey
): Promise<{ ciphertext: string; iv: string; tag: string }> {
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

  // Web Crypto AES-GCM output = [ciphertext bytes] + [16-byte auth tag]
  const fullBytes = new Uint8Array(encryptedBuffer);
  const tagLength = 16; // GCM default tag length
  const ciphertextBytes = fullBytes.slice(0, fullBytes.length - tagLength);
  const tagBytes = fullBytes.slice(fullBytes.length - tagLength);

  return {
    ciphertext: bufferToBase64(ciphertextBytes),
    iv: bufferToBase64(iv),
    tag: bufferToBase64(tagBytes),
  };
}
