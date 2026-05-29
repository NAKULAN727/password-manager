'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AgingAnalysisResult, AgingTier } from '../../lib/audit/agingTracker';
import { Clock, Sprout, TreePine, Leaf } from 'lucide-react';

interface AgingPanelProps {
  agingAnalysis: AgingAnalysisResult | null;
}

const TIER_STYLES: Record<AgingTier, { color: string; icon: React.ReactNode; label: string }> = {
  'Fresh': { color: 'text-emerald-400', icon: <Sprout size={12} />, label: 'Fresh' },
  'Maturing': { color: 'text-amber-400', icon: <TreePine size={12} />, label: 'Maturing' },
  'Aging': { color: 'text-orange-400', icon: <Leaf size={12} />, label: 'Needs Rotation' },
};

export function AgingPanel({ agingAnalysis }: AgingPanelProps) {
  if (!agingAnalysis) return null;

  const { tierCounts, agingEntries } = agingAnalysis;
  const total = tierCounts.fresh + tierCounts.maturing + tierCounts.aging;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={15} className="text-[#D4AF37]" />
        <h3 className="text-sm font-bold text-white">Credential Aging</h3>
      </div>

      {/* Tier summary */}
      <div className="grid grid-cols-3 gap-2">
        {(['Fresh', 'Maturing', 'Aging'] as AgingTier[]).map((tier) => {
          const style = TIER_STYLES[tier];
          const count = tier === 'Fresh' ? tierCounts.fresh : tier === 'Maturing' ? tierCounts.maturing : tierCounts.aging;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center"
            >
              <div className={`flex items-center justify-center gap-1.5 ${style.color} mb-1`}>
                {style.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{style.label}</span>
              </div>
              <p className="text-lg font-bold text-white font-mono">{count}</p>
              <p className="text-[9px] text-white/30">{pct}%</p>
            </motion.div>
          );
        })}
      </div>

      {/* Aging entries list */}
      {agingEntries.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Credentials needing rotation
          </p>
          {agingEntries.slice(0, 5).map((entry, idx) => (
            <motion.div
              key={entry.entryId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <span className="text-xs text-slate-300 font-medium truncate max-w-[60%]">
                {entry.label}
              </span>
              <span className="text-[10px] text-orange-400 font-mono">
                {entry.ageDays} days
              </span>
            </motion.div>
          ))}
          {agingEntries.length > 5 && (
            <p className="text-[10px] text-white/30 text-center mt-1">
              +{agingEntries.length - 5} more credentials need attention
            </p>
          )}
        </div>
      )}

      {agingEntries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 flex items-center gap-2"
        >
          <Sprout size={14} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            All credentials are within healthy rotation cycles. Your garden stays fresh.
          </p>
        </motion.div>
      )}
    </div>
  );
}
