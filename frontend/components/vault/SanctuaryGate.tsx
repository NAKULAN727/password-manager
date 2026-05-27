'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore } from '../../store/useVaultStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { KeyDerivationAnimation } from './KeyDerivationAnimation';
import {
  evaluatePhraseStrength,
  generateSanctuaryPhrase,
} from '../../lib/crypto/sanctuary';
import { Key, RefreshCw, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';

// ─── Strength Bar ────────────────────────────────────────────────────────────

function StrengthBar({ phrase }: { phrase: string }) {
  if (!phrase) return null;
  const { score, label, color, suggestions } = evaluatePhraseStrength(phrase);

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold font-mono" style={{ color }}>
          {label}
        </span>
        {suggestions[0] && (
          <span className="text-[10px] text-white/30 font-mono">{suggestions[0]}</span>
        )}
      </div>
    </div>
  );
}

// ─── Phrase Input ─────────────────────────────────────────────────────────────

function PhraseInput({
  label,
  value,
  onChange,
  showStrength = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  showStrength?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter sanctuary phrase'}
          className="glow-input w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 pr-11 text-sm text-white placeholder-white/20 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {showStrength && <StrengthBar phrase={value} />}
    </div>
  );
}

// ─── New User — Create Sanctuary ──────────────────────────────────────────────

function CreateSanctuary() {
  const { address } = useAuthStore();
  const { initializeSanctuary, isLoading, error, setError } = useVaultStore();

  const [phrase, setPhrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const handleGenerate = useCallback(() => {
    const generated = generateSanctuaryPhrase(5);
    setPhrase(generated);
    setConfirm('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMismatch(false);

    if (phrase.length < 12) {
      setError('Sanctuary phrase must be at least 12 characters.');
      return;
    }
    if (phrase !== confirm) {
      setMismatch(true);
      return;
    }

    await initializeSanctuary(phrase);
    // Clear sensitive inputs from DOM memory
    setPhrase('');
    setConfirm('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 16 }}
      className="w-full max-w-md"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <motion.div whileHover={{ scale: 1.05 }} className="mb-4">
          <Image
            src="/logo-web-redesigned.png"
            alt="Sphynx"
            width={120}
            height={120}
            className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.35)]"
            priority
          />
        </motion.div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
          Create Your Sanctuary Phrase
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xs leading-relaxed">
          This phrase permanently protects your encrypted sanctuary. Sphynx cannot recover or reset it.
        </p>
      </div>

      {isLoading ? (
        <KeyDerivationAnimation />
      ) : (
        <Card className="border-[#D4AF37]/15 bg-[#090D16]/50 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-red-400 text-xs leading-relaxed"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet salt display */}
            <div className="rounded-xl border border-white/5 bg-[#090D16]/80 p-3.5 text-xs flex flex-col gap-1">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                Vault Salt (Wallet Address)
              </span>
              <span className="font-mono text-[#D4AF37] break-all text-[11px]">{address}</span>
            </div>

            {/* Phrase generator */}
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-2 text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors font-semibold self-start"
            >
              <Sparkles size={13} />
              Generate secure phrase suggestion
            </button>

            <PhraseInput
              label="Sanctuary Phrase"
              value={phrase}
              onChange={setPhrase}
              showStrength
              placeholder="Create a strong sanctuary phrase"
            />

            <PhraseInput
              label="Confirm Sanctuary Phrase"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat your sanctuary phrase"
            />

            {mismatch && (
              <p className="text-xs text-red-400 font-mono -mt-2">
                Phrases do not match.
              </p>
            )}

            {/* Warning */}
            <div className="rounded-xl border border-amber-500/10 bg-amber-950/10 p-3.5 flex gap-2.5 text-xs text-amber-300/70 leading-relaxed">
              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-400" />
              If your sanctuary phrase is lost, your encrypted sanctuary cannot be recovered.
            </div>

            <Button
              variant="primary"
              type="submit"
              className="w-full gap-2 py-3.5 text-sm font-semibold"
            >
              <Key size={16} />
              Initialize Sanctuary
            </Button>
          </form>
        </Card>
      )}
    </motion.div>
  );
}

// ─── Returning User — Unlock Sanctuary ───────────────────────────────────────

function UnlockSanctuary() {
  const { address } = useAuthStore();
  const { unlockSanctuary, isLoading, error, setError } = useVaultStore();

  const [phrase, setPhrase] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phrase) return;
    await unlockSanctuary(phrase);
    setPhrase('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 16 }}
      className="w-full max-w-md"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <motion.div whileHover={{ scale: 1.05 }} className="mb-4">
          <Image
            src="/logo-web-redesigned.png"
            alt="Sphynx"
            width={120}
            height={120}
            className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.35)]"
            priority
          />
        </motion.div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
          Unlock Your Sanctuary
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your sanctuary phrase to decrypt your vault
        </p>
      </div>

      {isLoading ? (
        <KeyDerivationAnimation />
      ) : (
        <Card className="border-[#D4AF37]/15 bg-[#090D16]/50 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-red-400 text-xs leading-relaxed"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-xl border border-white/5 bg-[#090D16]/80 p-3.5 text-xs flex flex-col gap-1">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                Vault Salt (Wallet Address)
              </span>
              <span className="font-mono text-[#D4AF37] break-all text-[11px]">{address}</span>
            </div>

            <PhraseInput
              label="Sanctuary Phrase"
              value={phrase}
              onChange={setPhrase}
              placeholder="Enter your sanctuary phrase"
            />

            <Button
              variant="primary"
              type="submit"
              className="w-full gap-2 py-3.5 text-sm font-semibold"
            >
              <Key size={16} />
              Unlock Sanctuary
            </Button>
          </form>
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-mono">
        MetaMask will verify account ownership. KEK derivation happens locally and never touches the network.
      </p>
    </motion.div>
  );
}

// ─── Gate Orchestrator ────────────────────────────────────────────────────────

/**
 * SanctuaryGate detects whether the authenticated wallet is a new or returning user
 * and renders the appropriate onboarding or unlock flow.
 */
export function SanctuaryGate({ onLogout }: { onLogout: () => void }) {
  const { sanctuaryStatus, checkSanctuaryStatus } = useVaultStore();

  useEffect(() => {
    if (sanctuaryStatus === 'idle') {
      checkSanctuaryStatus();
    }
  }, [sanctuaryStatus, checkSanctuaryStatus]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#090D16] px-6 py-12">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/5 blur-[120px] animate-pulse-glow" />

      <div className="z-10 w-full flex flex-col items-center">
        <AnimatePresence mode="wait">
          {(sanctuaryStatus === 'idle' || sanctuaryStatus === 'checking') && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-slate-400 text-sm font-mono"
            >
              <RefreshCw size={20} className="animate-spin text-[#D4AF37]" />
              Verifying sanctuary status...
            </motion.div>
          )}

          {sanctuaryStatus === 'new_user' && (
            <motion.div key="new" className="w-full flex justify-center">
              <CreateSanctuary />
            </motion.div>
          )}

          {sanctuaryStatus === 'returning_user' && (
            <motion.div key="returning" className="w-full flex justify-center">
              <UnlockSanctuary />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onLogout}
          className="text-xs font-semibold text-[#D4AF37]/65 hover:text-[#D4AF37] transition-colors"
        >
          Sign Out Wallet
        </button>
      </div>
    </div>
  );
}
