'use client';

import React from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { ShieldAlert, Lock, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export function TamperAlarm() {
  const { 
    integrityViolations, 
    vaultEntries, 
    setIntegrityViolation, 
    lockVault 
  } = useVaultStore();

  // Find all active violations
  const activeViolationIds = Object.entries(integrityViolations)
    .filter(([_, violated]) => violated)
    .map(([id]) => id);

  if (activeViolationIds.length === 0) return null;

  // Resolve breached entry labels
  const breachedEntries = activeViolationIds.map(id => {
    const entry = vaultEntries.find(e => e.id === id);
    return entry ? entry.label : `Unknown Entry (${id.slice(0, 8)})`;
  });

  const handleAcknowledge = () => {
    // Reset all violation states
    activeViolationIds.forEach(id => {
      setIntegrityViolation(id, false);
    });
  };

  return (
    <>
      {/* 1. Immersive screen-wide Pulsing Red Security Perimeter */}
      <div className="fixed inset-0 z-[9990] pointer-events-none border-[3px] border-red-500/40 animate-pulse-perimeter" />

      {/* 2. Tactical Security Breach Modal Panel */}
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
        
        <div className="w-full max-w-lg rounded-3xl border border-red-500/25 bg-[#090D16]/95 p-8 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden select-none">
          
          {/* Subtle warning glow backdrop */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 blur-[80px]" />
          
          <div className="flex items-start gap-4 mb-6">
            <div className="shrink-0 rounded-2xl bg-red-500/15 border border-red-500/30 p-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] text-red-500 animate-bounce">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-red-400 tracking-tight flex items-center gap-1.5">
                Integrity Check Violated
              </h3>
              <p className="text-xs text-white/30 uppercase tracking-widest font-mono mt-1">
                HMAC Verification Failure
              </p>
            </div>
          </div>

          {/* Alarm Explanation */}
          <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-300">
            <p>
              Sphynx's local security sub-systems detected an <strong className="text-red-400 font-semibold">HMAC-SHA256 checksum mismatch</strong> for the following record:
            </p>

            {/* Affected Entries List */}
            <div className="rounded-xl border border-red-500/15 bg-red-950/10 p-3.5 font-mono text-xs text-red-300 flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
              {breachedEntries.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span>{name}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 border-l-2 border-[#D4AF37]/50 pl-3">
              <strong className="text-slate-200">What does this mean?</strong> The encrypted payload stored on the backend server does not match the tamper-proof signature derived from your key. The record has been modified, corrupted, or intercepted on the server.
            </p>
            
            <p className="text-xs text-slate-400">
              <strong className="text-red-400 font-semibold">Zero-Trust Action Taken:</strong> Decryption was blocked instantly in the browser memory to ensure your cryptographic vaults remain isolated and safe.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 border-t border-white/5 pt-6">
            
            {/* Safety First: Wipe Memory */}
            <Button
              variant="danger"
              onClick={lockVault}
              className="flex-1 gap-2 py-3 text-xs font-bold uppercase tracking-wider"
            >
              <Lock size={14} />
              Wipe Keys & Lock Vault
            </Button>

            {/* Admin Override: Acknowledge */}
            <Button
              variant="secondary"
              onClick={handleAcknowledge}
              className="flex-1 gap-2 py-3 border-white/10 hover:border-red-500/20 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider"
            >
              <XCircle size={14} />
              Acknowledge & Inspect
            </Button>

          </div>

        </div>
      </div>
    </>
  );
}
