'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Guardian } from '../../store/useGuardianStore';
import { Shield, UserCheck, Clock, UserX } from 'lucide-react';

interface GuardianCircleViewProps {
  guardians: Guardian[];
  threshold: number;
}

/**
 * Radial guardian circle visualization.
 * Displays guardians in a circular layout with status indicators.
 */
export function GuardianCircleView({ guardians, threshold }: GuardianCircleViewProps) {
  const activeCount = guardians.filter(g => g.status === 'accepted').length;
  const pendingCount = guardians.filter(g => g.status === 'pending').length;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Central circle with threshold info */}
      <div className="relative w-[240px] h-[240px]">
        {/* Center node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center z-10">
          <Shield size={24} className="text-[#D4AF37]" />
        </div>

        {/* Guardian nodes positioned in a circle */}
        {guardians.map((guardian, idx) => {
          const angle = (idx / Math.max(guardians.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const radius = 90;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const isAccepted = guardian.status === 'accepted';
          const isPending = guardian.status === 'pending';

          return (
            <motion.div
              key={guardian.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              {/* Connection line to center */}
              <svg
                className="absolute top-1/2 left-1/2 -z-10"
                style={{
                  width: `${Math.abs(x) + 20}px`,
                  height: `${Math.abs(y) + 20}px`,
                  transform: `translate(${x > 0 ? '-100%' : '0'}, ${y > 0 ? '-100%' : '0'})`,
                }}
              />

              {/* Guardian node */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isAccepted
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : isPending
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}
                title={`${guardian.guardianAddress.slice(0, 6)}...${guardian.guardianAddress.slice(-4)} — ${guardian.status}`}
              >
                {isAccepted ? <UserCheck size={16} /> : isPending ? <Clock size={14} /> : <UserX size={14} />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{activeCount} Active</span>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{pendingCount} Pending</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[#D4AF37]">
          <Shield size={12} />
          <span>Threshold: {threshold}</span>
        </div>
      </div>
    </div>
  );
}
