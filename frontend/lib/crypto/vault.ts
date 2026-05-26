/**
 * Helper to convert ArrayBuffer or Uint8Array into a Base64 string safely.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Helper to convert a Base64 string back into a Uint8Array safely.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives the final secure K_vault AES-256-GCM key using PBKDF2, MetaMask Signature Hashing, and HKDF.
 * The derived CryptoKey has `extractable: false`, guaranteeing it cannot be extracted or leaked.
 */
export async function deriveVaultKey(
  masterPassword: string,
  walletAddress: string,
  derivationSignature: string
): Promise<{ kVault: CryptoKey; kIntegrity: CryptoKey }> {
  const enc = new TextEncoder();

  // --- Step 1: PBKDF2 intermediate key derivation (K1) ---
  // Import the raw master password string as key material
  const passwordKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Normalize wallet address as salt
  const saltBytes = enc.encode(walletAddress.toLowerCase());

  // Derive the intermediate K1 raw bits via 600,000 iterations of PBKDF2-SHA256
  const k1Bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 600000,
      hash: 'SHA-256',
    },
    passwordKeyMaterial,
    256 // 256 bits = 32 bytes
  );

  // Import K1 raw bytes as HKDF input key material (IKM)
  const hkdfIkm = await window.crypto.subtle.importKey(
    'raw',
    k1Bits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // --- Step 2: Hashing MetaMask Derivation Signature to yield S_wallet ---
  const signatureBytes = enc.encode(derivationSignature);
  const sWallet = await window.crypto.subtle.digest('SHA-256', signatureBytes);

  // --- Step 3: HKDF final AES-256-GCM key derivation (K_vault) ---
  const kVault = await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: sWallet,
      info: enc.encode('vaultx-vault-key-v1'),
    },
    hkdfIkm,
    { name: 'AES-GCM', length: 256 },
    false, // extractable: false -> Critical! Browser-enforced protection against memory leaks and XSS
    ['encrypt', 'decrypt']
  );

  // --- Step 4: HKDF final HMAC integrity key derivation (kIntegrity) ---
  const kIntegrity = await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: sWallet,
      info: enc.encode('vaultx-integrity-key-v1'),
    },
    hkdfIkm,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false, // extractable: false -> Securely isolated key in memory
    ['sign', 'verify']
  );

  return { kVault, kIntegrity };
}

/**
 * Computes an HMAC-SHA256 checksum of an entry's data components to assert vault integrity.
 */
export async function computeEntryHMAC(
  ciphertext: string,
  iv: string,
  tag: string,
  label: string,
  username: string,
  kIntegrity: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const payloadString = [ciphertext, iv, tag, label, username].join('|');
  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    kIntegrity,
    enc.encode(payloadString)
  );
  return bufferToBase64(signatureBuffer);
}

/**
 * Verifies the HMAC-SHA256 checksum of an entry's data components to detect server-side tampering.
 */
export async function verifyEntryHMAC(
  ciphertext: string,
  iv: string,
  tag: string,
  label: string,
  username: string,
  checksum: string,
  kIntegrity: CryptoKey
): Promise<boolean> {
  const enc = new TextEncoder();
  const payloadString = [ciphertext, iv, tag, label, username].join('|');
  try {
    const signatureBytes = base64ToBuffer(checksum);
    const isValid = await window.crypto.subtle.verify(
      'HMAC',
      kIntegrity,
      signatureBytes as any,
      enc.encode(payloadString)
    );
    return isValid;
  } catch (err) {
    console.error('Integrity checksum verification failed:', err);
    return false;
  }
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  tag: string;        // Base64
}

/**
 * Encrypts a plaintext string locally in-browser using the derived non-extractable K_vault.
 * Splits Web Crypto's unified buffer to isolate the 16-byte GCM authentication tag.
 */
export async function encryptEntry(
  plainText: string,
  kVault: CryptoKey
): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  
  // Generate a cryptographically random, unique 96-bit (12 bytes) Initialization Vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt plaintext using AES-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    kVault,
    enc.encode(plainText)
  );

  // Native encrypt output format: [ciphertext bytes] + [16-byte authenticated tag]
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    ciphertext: bufferToBase64(ciphertextBytes),
    iv: bufferToBase64(iv),
    tag: bufferToBase64(tagBytes),
  };
}

/**
 * Decrypts a base64 encoded ciphertext locally in-browser using the derived non-extractable K_vault.
 * Reconstructs the browser-enveloped GCM buffer before calling SubtleCrypto.decrypt.
 */
export async function decryptEntry(
  ciphertextBase64: string,
  ivBase64: string,
  tagBase64: string,
  kVault: CryptoKey
): Promise<string> {
  const dec = new TextDecoder();

  // Convert Base64 strings back to binary buffers
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const tag = base64ToBuffer(tagBase64);

  // Re-assemble the standard SubtleCrypto unified buffer: [ciphertext] + [tag]
  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length);
  encryptedBytes.set(ciphertext, 0);
  encryptedBytes.set(tag, ciphertext.length);

  // Decrypt using Web Crypto GCM
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    kVault,
    encryptedBytes
  );

  return dec.decode(decryptedBuffer);
}
