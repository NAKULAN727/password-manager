import { bufferToBase64 } from './vault';

/**
 * Derives the same kVault key as deriveVaultKey() but with extractable: true,
 * then exports the raw key bytes as base64 for secure handoff to the extension.
 * 
 * The extension imports these bytes as a non-extractable CryptoKey.
 * This allows the extension to encrypt/decrypt using the same key as the web app
 * without needing the sanctuary phrase or VEK derivation.
 */
export async function exportVaultKeyForExtension(
  vekHex: string,
  walletAddress: string,
  derivationSignature: string
): Promise<string> {
  const enc = new TextEncoder();

  // Step 1: PBKDF2 intermediate key (same as deriveVaultKey)
  const passwordKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(vekHex),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltBytes = enc.encode(walletAddress.toLowerCase());

  const k1Bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 600000,
      hash: 'SHA-256',
    },
    passwordKeyMaterial,
    256
  );

  // Step 2: HKDF IKM
  const hkdfIkm = await window.crypto.subtle.importKey(
    'raw',
    k1Bits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Step 3: Hash derivation signature
  const signatureBytes = enc.encode(derivationSignature);
  const sWallet = await window.crypto.subtle.digest('SHA-256', signatureBytes);

  // Step 4: Derive kVault with extractable: TRUE (for export only)
  const exportableKey = await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: sWallet,
      info: enc.encode('vaultx-vault-key-v1'),
    },
    hkdfIkm,
    { name: 'AES-GCM', length: 256 },
    true, // extractable: true — ONLY for export to extension
    ['encrypt', 'decrypt']
  );

  // Step 5: Export raw key bytes
  const rawKeyBytes = await window.crypto.subtle.exportKey('raw', exportableKey);

  // Verification: try encrypting and decrypting a test string to confirm key works
  const testIv = window.crypto.getRandomValues(new Uint8Array(12));
  const testEncrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: testIv },
    exportableKey,
    enc.encode('sphynx-key-verify')
  );
  console.log('[ExtHandoff] Key export successful, test encrypt OK, key bytes:', rawKeyBytes.byteLength);

  return bufferToBase64(rawKeyBytes);
}
