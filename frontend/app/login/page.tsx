'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { WalletConnectBtn } from '../../components/auth/WalletConnectBtn';
import { Card } from '../../components/ui/Card';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * Premium login view that renders the EIP-4361 authentication layout
 * using staggered, spring-based Framer Motion entrance animations.
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

  // Framer Motion staggered entrance configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 85,
        damping: 16,
      },
    },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-transparent">
      
      {/* Floating Back Navigation Anchor */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 0.6, x: 0 }}
        whileHover={{ opacity: 1, x: -3 }}
        transition={{ duration: 0.3 }}
        className="absolute top-8 left-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37] select-none"
        >
          <ArrowLeft size={14} />
          Back to Landing
        </Link>
      </motion.div>

      {/* Main staggered animated content block */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md z-10"
      >
        
        {/* Security Vault Banner Header */}
        <motion.div variants={itemVariants} className="mb-8 flex flex-col items-center text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 to-[#D4AF37] p-3 shadow-[0_0_20px_rgba(212,175,55,0.25)] border border-[#D4AF37]/35 cursor-default"
          >
            <Shield className="h-7 w-7 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent font-mono">
            Access The Sanctuary
          </h2>
          
          <p className="mt-2 text-sm text-slate-400">
            Secure sign-in via EIP-4361 cryptographic handshake
          </p>
        </motion.div>

        {/* Central Glassmorphic Gateway Card with Burnished Gold Border */}
        <motion.div variants={itemVariants}>
          <Card className="border-[#D4AF37]/15 bg-[#090D16]/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <WalletConnectBtn />
          </Card>
        </motion.div>

        {/* Core Security Disclaimers */}
        <motion.p 
          variants={itemVariants} 
          className="mt-6 text-center text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto font-mono"
        >
          By signing in, you confirm the digital signature in your wallet. Sphynx never asks for, stores, or transmits your seed phrases or private keys.
        </motion.p>
      </motion.div>
    </div>
  );
}
