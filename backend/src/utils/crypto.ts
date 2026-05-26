import crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Generates a cryptographically secure random hexadecimal nonce.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface SiweFields {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

/**
 * Parses a standard EIP-4361 (SIWE) message into its structural components.
 * Returns null if the message is malformed.
 */
export function parseSiweMessage(message: string): SiweFields | null {
  try {
    const lines = message.split('\n');
    if (lines.length < 5) return null;

    // Standard SIWE Header validation: "${domain} wants you to sign in with your Ethereum account:"
    const headerMatch = lines[0].match(/^([^ ]+) wants you to sign in with your Ethereum account:$/);
    if (!headerMatch) return null;
    const domain = headerMatch[1];

    // Followed by the Ethereum address
    const address = lines[1]?.trim();
    if (!ethers.isAddress(address)) return null;

    const fields: Partial<SiweFields> = { domain, address };

    // Scan lines for standard EIP-4361 metadata tags
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('URI: ')) {
        fields.uri = trimmed.substring(5).trim();
      } else if (trimmed.startsWith('Version: ')) {
        fields.version = trimmed.substring(9).trim();
      } else if (trimmed.startsWith('Chain ID: ')) {
        fields.chainId = parseInt(trimmed.substring(10).trim(), 10);
      } else if (trimmed.startsWith('Nonce: ')) {
        fields.nonce = trimmed.substring(7).trim();
      } else if (trimmed.startsWith('Issued At: ')) {
        fields.issuedAt = trimmed.substring(11).trim();
      }
    }

    if (!fields.uri || !fields.version || !fields.chainId || !fields.nonce || !fields.issuedAt) {
      return null;
    }

    return fields as SiweFields;
  } catch (error) {
    return null;
  }
}

/**
 * Recovers the signer's address from the signed message and signature,
 * and asserts that it matches the expected wallet address.
 */
export function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}
