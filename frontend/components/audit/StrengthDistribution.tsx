'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PasswordClassification } from '../../lib/audit/strengthAnalyzer';
import { EntryStrengthData } from '../../store/useAuditStore';
import { Shield, Sprout, TreePine, Crown } from 'lucide-react';

interface StrengthDistributionProps {
  strengthData: EntryStrengthData[];
}

const TIER_CONFIG: Record<PasswordClassification, { 
  color: string; 
  bg: string; 
  border: string;
  icon: React.ReactNode;
  label: string;
}> = {
  'Weak': { 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20',
    icon: <Sprout size={14} />,
    label: 'Needs Nurturing',
  },
  'Fair': { 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/20',
    icon: <Sprout size={14} />,
    label: 'Growing',
  },
  'Strong': { 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/20',
    icon: <TreePine size={14} />,
    label: 'Thriving',
  },
  'Sanctuary Grade': { 
    color: 'text-[#D4AF37]', 
    bg: 'bg-[#D4AF37]/10', 
    border: 'border-[#D4AF37]/20',
    icon: <Crown size={14} />,
    label: 'Flourishing',
  },
};

export function StrengthDistribution({ strengthData }: StrengthDistributionProps) {
  // Count entries per tier
  const counts: Record<PasswordClassification, number> = {
    'Weak': 0,
    'Fair': 0,
    'Strong': 0,
    'Sanctuary Grade': 0,
  };

  for (const entry of strengthData) {
    counts[entry.classification]++;
  }

  const total = strengthData.length;
  const tiers: PasswordClassification[] = ['Sanctuary Grade', 'Strong', 'Fair', 'Weak'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={15} className="text-[#D4AF37]" />
        <h3 className="text-sm font-bold text-white">Strength Distribution</h3>
      </div>

      <div className="flex flex-col gap-3">
        {tiers.map((tier, idx) => {
          const config = TIER_CONFIG[tier];
          const count = counts[tier];
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-semibold ${config.color}`}>
                  {config.icon}
                  <span>{config.label}</span>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                  {count} / {total}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${config.bg.replace('/10', '/40')}`}
                  style={{ backgroundColor: config.color.includes('#') ? '#D4AF37' : undefined }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
