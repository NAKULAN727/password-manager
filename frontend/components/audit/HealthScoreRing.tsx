'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SecurityLevel } from '../../lib/audit/healthScorer';

interface HealthScoreRingProps {
  score: number;
  level: SecurityLevel;
  size?: number;
}

const LEVEL_COLORS: Record<SecurityLevel, { ring: string; glow: string; text: string }> = {
  'Vulnerable': { ring: '#ef4444', glow: 'rgba(239,68,68,0.2)', text: 'text-red-400' },
  'Developing': { ring: '#f59e0b', glow: 'rgba(245,158,11,0.2)', text: 'text-amber-400' },
  'Fortified': { ring: '#10b981', glow: 'rgba(16,185,129,0.2)', text: 'text-emerald-400' },
  'Sanctuary Grade': { ring: '#D4AF37', glow: 'rgba(212,175,55,0.25)', text: 'text-[#D4AF37]' },
};

export function HealthScoreRing({ score, level, size = 180 }: HealthScoreRingProps) {
  const colors = LEVEL_COLORS[level];
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ background: colors.glow }}
        />

        <svg width={size} height={size} className="relative z-10 -rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>

        {/* Center score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <motion.span
            className={`text-4xl font-black font-mono ${colors.text}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-1">
            / 100
          </span>
        </div>
      </div>

      {/* Level badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}
      >
        {level}
      </motion.div>
    </div>
  );
}
