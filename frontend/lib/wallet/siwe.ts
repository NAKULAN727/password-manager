interface SiweMessageParams {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

/**
 * Formats a standard EIP-4361 compliant "Sign-In with Ethereum" message.
 */
export function createSiweMessage({
  domain,
  address,
  statement,
  uri,
  version,
  chainId,
  nonce,
  issuedAt
}: SiweMessageParams): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`
  ].join('\n');
}
