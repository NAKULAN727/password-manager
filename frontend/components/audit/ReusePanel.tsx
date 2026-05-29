'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ReuseGroup } from '../../lib/audit/reuseDetector';
import { Copy, AlertCircle, Leaf } from 'lucide-react';

interface ReusePanelProps {
  reuseGroups: ReuseGroup[];
  totalEntries: number;
  failedEntryIds: string[];
}

export function ReusePanel({ reuseGroups, totalEntries, failedEntryIds }: ReusePanelProps) {
  if (totalEntries < 2) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Copy size={15} className="text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-white">Reuse Detection</h3>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-slate-400">
            Reuse detection requires at least 2 stored credentials to compare.
          </p>
        </div>
      </div>
    );
  }

  const hasReuse = reuseGroups.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <Copy size={15} className="text-[#D4AF37]" />
        <h3 className="text-sm font-bold text-white">Reuse Detection</h3>
      </div>

      {!hasReuse ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex items-center gap-3"
        >
          <Leaf size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            Every credential in your vault is unique. Your garden has no shared roots — well maintained.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {reuseGroups.map((group, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-xl border border-amber-500/10 bg-amber-950/10 p-4"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-amber-300">
                    {group.count} accounts share the same password
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.labels.map((label, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Reused credentials enable credential-stuffing attacks across these services. 
                    Each account benefits from its own unique password.
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {failedEntryIds.length > 0 && (
            <p className="text-[10px] text-white/30 mt-1">
              {failedEntryIds.length} entry(ies) could not be analyzed due to decryption errors.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
