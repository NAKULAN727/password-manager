'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api/client';
import { createSiweMessage } from '../../lib/wallet/siwe';
import { Button } from '../ui/Button';
import { LogOut, Key } from 'lucide-react';

/**
 * Premium, interactive authentication button that coordinates MetaMask handshake,
 * EIP-4361 (SIWE) signing flow, Express verification, and session redirection.
 */
export function WalletConnectBtn() {
  const router = useRouter();
  
  const {
    address,
    isAuthenticated,
    isLoading,
    error,
    setSession,
    clearSession,
    setError,
    setLoading
  } = useAuthStore();

  const [providerExists, setProviderExists] = useState(false);

  // Assert MetaMask/Web3 provider presence in the window context safely on client
  useEffect(() => {
    setProviderExists(typeof window !== 'undefined' && !!(window as any).ethereum);
  }, []);

  const handleConnectAndSign = async () => {
    if (!providerExists) {
      setError('MetaMask is not installed. Please install the MetaMask extension to authenticate.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Prompt user to select account and connect wallet
      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts were returned by the wallet provider.');
      }
      
      const walletAddress = accounts[0];

      // 2. Fetch single-use cryptographic nonce from Express Backend
      const { nonce } = await api.post('/auth/nonce', { address: walletAddress });

      // 3. Extract network chain ID and domain parameters
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const domain = window.location.host;
      const origin = window.location.origin;

      // 4. Construct valid standard EIP-4361 SIWE message
      const siweMessage = createSiweMessage({
        domain,
        address: walletAddress,
        statement: 'Sign in to ZK Password Manager. Your private keys never leave your machine.',
        uri: origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString()
      });

      // 5. Query signer interface and trigger signature confirmation dialog
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(siweMessage);

      // 6. Dispatch signature to backend verification route
      const authData = await api.post('/auth/verify', {
        address: walletAddress,
        message: siweMessage,
        signature
      });

      // 7. Save credentials and active JWT token globally
      setSession(authData.user.address, authData.token);

      // 8. Redirect authenticated user to Dashboard
      router.push('/dashboard');
    } catch (err: any) {
      // Serialize the error safely to scan for cryptographic signature error signatures
      const errorString = String(err?.message || err?.stack || err || '').toLowerCase();
      
      const isPending = errorString.includes('-32002') || 
                        errorString.includes('already pending') || 
                        errorString.includes('coalesce error');
                        
      const isRejected = errorString.includes('4001') || 
                         errorString.includes('rejected');

      if (isRejected) {
        setError('Authentication cancelled: Signature request was rejected in MetaMask.');
        console.warn('MetaMask: Signature request cancelled by user.');
      } else if (isPending) {
        setError('Connection pending: A request is already waiting in MetaMask. Please open your MetaMask browser extension popup to approve or reject the active request.');
        console.warn('MetaMask: Connection blocked because another prompt is already pending in the extension.');
      } else {
        // Log genuine unexpected errors with full stack details
        console.error('SIWE Authentication failed:', err);
        setError(err.message || 'An unexpected error occurred during wallet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearSession();
    router.push('/');
  };

  if (isAuthenticated && address) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 px-4 py-3 text-emerald-400 text-sm font-mono tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.03)]">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        
        <Button variant="outline" onClick={handleDisconnect} className="w-full gap-2 py-3">
          <LogOut size={16} />
          Disconnect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/15 bg-red-500/5 p-4 text-red-400 text-xs leading-relaxed animate-fade-in">
          <div className="font-semibold mb-1">Authentication Error</div>
          {error}
        </div>
      )}
      
      <Button
        variant="primary"
        onClick={handleConnectAndSign}
        isLoading={isLoading}
        className="w-full gap-2 py-4 text-base font-semibold"
      >
        {!isLoading && <Key size={20} />}
        {isLoading ? 'Authenticating...' : 'Connect Wallet & Sign In'}
      </Button>

      {!providerExists && !isLoading && (
        <p className="mt-3 text-center text-xs text-white/30">
          Requires the <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors font-medium">MetaMask extension</a>
        </p>
      )}
    </div>
  );
}
