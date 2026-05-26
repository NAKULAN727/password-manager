'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { WalletConnectBtn } from '../../components/auth/WalletConnectBtn';
import { Card } from '../../components/ui/Card';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Premium login view that renders the EIP-4361 authentication layout
 * and guards against authorized double-entry (auto-pushing to dashboard).
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Active Session Redirection: Guard against double login attempts
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#090D16] px-6 py-12">
      
      {/* Centered decorative ambient radial light (Warm Gold Glow) */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/5 blur-[120px] animate-pulse-glow" />

      {/* Floating Back Navigation Anchor */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]/50 hover:text-[#D4AF37] transition-all duration-300 select-none"
      >
        <ArrowLeft size={14} />
        Back to Landing
      </Link>

      <div className="w-full max-w-md animate-fade-in z-10">
        
        {/* Security Vault Banner Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 to-[#D4AF37] p-3 shadow-[0_0_20px_rgba(212,175,55,0.25)] border border-[#D4AF37]/35">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent font-mono">
            Access The Sanctuary
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Secure sign-in via EIP-4361 cryptographic handshake
          </p>
        </div>

        {/* Central Glassmorphic Gateway Card with Burnished Gold Border */}
        <Card className="border-[#D4AF37]/15 bg-[#090D16]/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <WalletConnectBtn />
        </Card>

        {/* Core Security Disclaimers */}
        <p className="mt-6 text-center text-xs text-white/20 leading-relaxed max-w-xs mx-auto font-mono">
          By signing in, you confirm the digital signature in your wallet. Sphynx never asks for, stores, or transmits your seed phrases or private keys.
        </p>
      </div>
    </div>
  );
}
