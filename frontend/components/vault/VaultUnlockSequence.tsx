'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

const GOLD = '#79E6FF';
const GOLD_DIM = 'rgba(245, 185, 66, 0.35)';
const GOLD_GLOW = 'rgba(245, 185, 66, 0.55)';
const DURATION_MS = 2800;

const STATUS_STEPS = [
  'Wallet Authenticated',
  'KEK Derived',
  'VEK Decrypted',
  'Vault Key Loaded',
] as const;

const GLYPHS = '0123456789ABCDEF⊕∑∞◈◇⬡⌁⌖⌗⏣⎔⎕'.split('');

interface VaultUnlockSequenceProps {
  onComplete?: () => void;
}

/**
 * Premium cryptographic vault unlock sequence (~2.8s).
 * GPU-friendly transforms only; no spinners or progress bars.
 */
export function VaultUnlockSequence({ onComplete }: VaultUnlockSequenceProps) {
  const [phase, setPhase] = useState(0);

  const ringGlyphs = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        char: GLYPHS[i % GLYPHS.length],
        angle: (i / 24) * 360,
      })),
    []
  );

  useEffect(() => {
    const t0 = window.setTimeout(() => setPhase(1), 120);
    const t1 = window.setTimeout(() => setPhase(2), 520);
    const t2 = window.setTimeout(() => setPhase(3), 920);
    const t3 = window.setTimeout(() => setPhase(4), 1320);
    const t4 = window.setTimeout(() => setPhase(5), 1720);
    const t5 = window.setTimeout(() => setPhase(6), 2120);
    const t6 = window.setTimeout(() => setPhase(7), 2520);
    const t7 = window.setTimeout(() => {
      onComplete?.();
    }, DURATION_MS);

    return () => {
      [t0, t1, t2, t3, t4, t5, t6, t7].forEach(clearTimeout);
    };
  }, [onComplete]);

  const visibleStatuses = phase >= 5 ? Math.min(phase - 4, 4) : 0;

  return (
    <div
      className="relative flex h-full min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#06090f] select-none"
      aria-live="polite"
      aria-busy={phase < 7}
      aria-label="Unlocking vault"
    >
      {/* Ambient depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 45%, rgba(245,185,66,0.08) 0%, transparent 65%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(8,12,20,1) 0%, #06090f 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,185,66,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(245,185,66,0.9) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Energy lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 200 + Math.cos(rad) * 190;
          const y1 = 200 + Math.sin(rad) * 190;
          return (
            <motion.line
              key={deg}
              x1={x1}
              y1={y1}
              x2={200}
              y2={200}
              stroke={GOLD}
              strokeWidth={1}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={
                phase >= 3
                  ? { opacity: [0, 0.75, 0.2] }
                  : { opacity: 0 }
              }
              transition={{
                duration: 0.5,
                delay: i * 0.045,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                filter: `drop-shadow(0 0 6px ${GOLD_GLOW})`,
              }}
            />
          );
        })}
      </svg>

      {/* Core lock stage */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          {/* Rotating glyph ring */}
          <motion.div
            className="absolute inset-0 will-change-transform"
            animate={{ rotate: phase >= 7 ? 0 : 360 }}
            transition={
              phase >= 7
                ? { duration: 0.5, ease: 'easeOut' }
                : { duration: 18, repeat: Infinity, ease: 'linear' }
            }
          >
            {ringGlyphs.map(({ char, angle }) => (
              <span
                key={angle}
                className="absolute left-1/2 top-1/2 font-mono text-[10px] font-medium tracking-tight"
                style={{
                  color: GOLD_DIM,
                  transform: `rotate(${angle}deg) translateY(-98px) rotate(${-angle}deg)`,
                  textShadow: `0 0 12px ${GOLD_GLOW}`,
                }}
              >
                {char}
              </span>
            ))}
          </motion.div>

          {/* Outer pulse rings */}
          <motion.div
            className="absolute h-[168px] w-[168px] rounded-full border"
            style={{ borderColor: 'rgba(245,185,66,0.12)' }}
            animate={
              phase >= 2
                ? {
                    scale: [1, 1.06, 1],
                    opacity: [0.4, 0.85, 0.4],
                  }
                : { scale: 1, opacity: 0.2 }
            }
            transition={{ duration: 1.8, repeat: phase >= 2 && phase < 6 ? Infinity : 0, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute h-[140px] w-[140px] rounded-full"
            style={{
              boxShadow: `0 0 40px ${GOLD_GLOW}, inset 0 0 24px rgba(245,185,66,0.06)`,
            }}
            animate={{
              opacity: phase >= 1 ? [0.5, 1, 0.5] : 0.3,
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Vault lock SVG */}
          <motion.div
            className="relative z-20"
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{
              scale: phase >= 7 ? 0.92 : 1,
              opacity: phase >= 7 ? 0 : 1,
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg width="88" height="100" viewBox="0 0 88 100" fill="none" aria-hidden>
              <defs>
                <linearGradient id="lockBody" x1="44" y1="38" x2="44" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1a2030" />
                  <stop offset="1" stopColor="#0c1018" />
                </linearGradient>
                <linearGradient id="lockGold" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#fde9a8" />
                  <stop offset="0.5" stopColor={GOLD} />
                  <stop offset="1" stopColor="#c8942a" />
                </linearGradient>
                <filter id="lockGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Scan beam */}
              <AnimatePresence>
                {phase >= 2 && phase < 5 && (
                  <motion.rect
                    x="18"
                    y="42"
                    width="52"
                    height="3"
                    rx="1.5"
                    fill="url(#lockGold)"
                    initial={{ opacity: 0, y: 42 }}
                    animate={{ opacity: [0, 0.9, 0], y: [42, 78, 42] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ filter: `drop-shadow(0 0 8px ${GOLD_GLOW})` }}
                  />
                )}
              </AnimatePresence>

              {/* Shackle */}
              <motion.g
                style={{ originX: '44px', originY: '36px' }}
                animate={{
                  rotate: phase >= 4 ? -58 : 0,
                  y: phase >= 4 ? -6 : 0,
                }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <path
                  d="M28 36V24C28 14.0589 36.0589 6 46 6C55.9411 6 64 14.0589 64 24V36"
                  stroke="url(#lockGold)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#lockGlow)"
                />
              </motion.g>

              {/* Body */}
              <rect
                x="14"
                y="38"
                width="60"
                height="58"
                rx="8"
                fill="url(#lockBody)"
                stroke="url(#lockGold)"
                strokeWidth="2"
                filter="url(#lockGlow)"
              />
              <circle cx="44" cy="62" r="6" fill="#06090f" stroke={GOLD} strokeWidth="2" />
              <rect x="41" y="62" width="6" height="14" rx="2" fill={GOLD} opacity="0.85" />
            </svg>
          </motion.div>

          {/* Particle burst */}
          {phase >= 4 &&
            Array.from({ length: 20 }).map((_, i) => {
              const a = (i / 20) * Math.PI * 2;
              const dist = 48 + (i % 3) * 14;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
                  style={{ backgroundColor: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(a) * dist,
                    y: Math.sin(a) * dist,
                    opacity: [0, 1, 0],
                    scale: [0, 1.2, 0],
                  }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              );
            })}

          {/* Shield logo morph */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: phase >= 6 ? 1 : 0,
              scale: phase >= 6 ? 1 : 0.7,
            }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative flex h-[120px] w-[120px] items-center justify-center rounded-full"
              style={{
                boxShadow: `0 0 60px ${GOLD_GLOW}, 0 0 120px rgba(245,185,66,0.15)`,
              }}
            >
              <Image
                src="/logo-web-redesigned.png"
                alt="Sphynx"
                width={96}
                height={96}
                className="object-contain drop-shadow-[0_0_24px_rgba(245,185,66,0.45)]"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* Signature verified */}
        <AnimatePresence mode="wait">
          {phase >= 2 && phase < 5 && (
            <motion.p
              key="sig"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              Wallet Signature Verified
            </motion.p>
          )}
        </AnimatePresence>

        {/* Status checklist */}
        <div className="mt-8 flex min-h-[108px] flex-col gap-2.5">
          {STATUS_STEPS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -12 }}
              animate={{
                opacity: i < visibleStatuses ? 1 : 0,
                x: i < visibleStatuses ? 0 : -12,
              }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2.5"
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full border"
                style={{
                  borderColor: i < visibleStatuses ? GOLD : 'rgba(255,255,255,0.1)',
                  backgroundColor: i < visibleStatuses ? 'rgba(245,185,66,0.12)' : 'transparent',
                }}
              >
                {i < visibleStatuses && (
                  <Check size={10} strokeWidth={3} style={{ color: GOLD }} />
                )}
              </span>
              <span
                className="font-mono text-xs tracking-wide"
                style={{
                  color: i < visibleStatuses ? 'rgba(248,250,252,0.88)' : 'rgba(255,255,255,0.2)',
                }}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Exit vignette */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[#06090f]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 7 ? 1 : 0 }}
        transition={{ duration: 0.35, ease: 'easeIn' }}
      />
    </div>
  );
}

/** Minimum unlock ceremony duration before revealing the dashboard. */
export const VAULT_UNLOCK_MIN_MS = DURATION_MS;
