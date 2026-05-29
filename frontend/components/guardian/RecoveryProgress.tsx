'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RecoveryRequest } from '../../store/useGuardianStore';
import { Clock, Shield, CheckCircle2, Loader2, Lock } from 'lucide-react';

interface RecoveryProgressProps {
  request: RecoveryRequest;
}

type RecoveryStep = 'cooldown' | 'awaiting' | 'threshold_met' | 'reconstruction';

function getActiveStep(request: RecoveryRequest): RecoveryStep {
  if (request.status === 'pending_cooldown') return 'cooldown';
  if (request.thresholdMet) return 'threshold_met';
  return 'awaiting';
}

const STEPS = [
  { key: 'cooldown', label: 'Cooldown Period', icon: Clock },
  { key: 'awaiting', label: 'Guardian Approvals', icon: Shield },
  { key: 'threshold_met', label: 'Threshold Reached', icon: CheckCircle2 },
  { key: 'reconstruction', label: 'VEK Reconstruction', icon: Lock },
] as const;

export function RecoveryProgress({ request }: RecoveryProgressProps) {
  const activeStep = getActiveStep(request);
  const activeIdx = STEPS.findIndex(s => s.key === activeStep);

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-white/5" />
        <motion.div
          className="absolute top-5 left-8 h-0.5 bg-[#D4AF37]/50"
          initial={{ width: 0 }}
          animate={{ width: `${(activeIdx / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ maxWidth: 'calc(100% - 64px)' }}
        />

        {STEPS.map((step, idx) => {
          const isComplete = idx < activeIdx;
          const isActive = idx === activeIdx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isComplete
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : isActive
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {isActive && step.key === 'awaiting' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </motion.div>
              <span className={`text-[9px] font-semibold uppercase tracking-wider text-center max-w-[80px] ${
                isActive ? 'text-[#D4AF37]' : isComplete ? 'text-emerald-400' : 'text-white/30'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Approval counter */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
        <p className="text-2xl font-black font-mono text-[#D4AF37]">
          {request.approvalsCollected} <span className="text-white/30 text-lg">/ {request.threshold}</span>
        </p>
        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
          Guardian Approvals Collected
        </p>
      </div>

      {/* Cooldown timer */}
      {request.status === 'pending_cooldown' && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-3 text-center">
          <p className="text-xs text-amber-300">
            <Clock size={12} className="inline mr-1.5" />
            Cooldown active until {new Date(request.cooldownExpiresAt).toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            This period allows the legitimate owner to detect and cancel fraudulent attempts.
          </p>
        </div>
      )}
    </div>
  );
}
