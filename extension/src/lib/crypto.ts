/**
 * Helper to convert ArrayBuffer or Uint8Array into a Base64 string safely.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to convert a Base64 string back into a Uint8Array safely.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
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
  const subtle = crypto.subtle;

  // --- Step 1: PBKDF2 intermediate key derivation (K1) ---
  const passwordKeyMaterial = await subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Normalize wallet address as salt
  const saltBytes = enc.encode(walletAddress.toLowerCase());

  // Derive the intermediate K1 raw bits via 600,000 iterations of PBKDF2-SHA256
  const k1Bits = await subtle.deriveBits(
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
  const hkdfIkm = await subtle.importKey(
    'raw',
    k1Bits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // --- Step 2: Hashing MetaMask Derivation Signature to yield S_wallet ---
  const signatureBytes = enc.encode(derivationSignature);
  const sWallet = await subtle.digest('SHA-256', signatureBytes);

  // --- Step 3: HKDF final AES-256-GCM key derivation (K_vault) ---
  const kVault = await subtle.deriveKey(
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
  const kIntegrity = await subtle.deriveKey(
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
  const subtle = crypto.subtle;

  // Convert Base64 strings back to binary buffers
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const tag = base64ToBuffer(tagBase64);

  // Re-assemble the standard SubtleCrypto unified buffer: [ciphertext] + [tag]
  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length);
  encryptedBytes.set(ciphertext, 0);
  encryptedBytes.set(tag, ciphertext.length);

  // Decrypt using Web Crypto GCM
  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    kVault,
    encryptedBytes
  );

  return dec.decode(decryptedBuffer);
}
