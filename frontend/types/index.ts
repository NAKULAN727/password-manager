export interface User {
  address: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
