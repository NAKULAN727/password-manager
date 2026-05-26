'use client';

import React, { useEffect, useState } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { ShieldCheck, ClipboardCheck } from 'lucide-react';

export function ClipboardPurgeBar() {
  const { activeClipboardTimer, setActiveClipboardTimer } = useVaultStore();
  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(15);

  useEffect(() => {
    if (!activeClipboardTimer) {
      setProgress(0);
      return;
    }

    const duration = activeClipboardTimer.duration || 15000;
    const startTime = Date.now();
    
    // Set initial states
    setProgress(100);
    setSecondsLeft(Math.ceil(duration / 1000));

    // High frequency interval (100ms) for pixel-perfect smooth motion
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      const newProgress = (remaining / duration) * 100;
      setProgress(newProgress);
      setSecondsLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(intervalId);
        setActiveClipboardTimer(null);
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeClipboardTimer, setActiveClipboardTimer]);

  if (!activeClipboardTimer || progress <= 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none animate-fade-in">
      
      {/* Depleting Burnished Gold Progress Line */}
      <div className="w-full h-[3px] bg-[#090D16]/50">
        <div 
          className="h-full bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] shadow-[0_1px_10px_rgba(212,175,55,0.7)] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating mini glassmorphic secure clipboard status panel */}
      <div className="flex justify-center mt-2.5">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#090D16]/90 border border-[#D4AF37]/25 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)] select-none pointer-events-auto">
          <ClipboardCheck className="h-3.5 w-3.5 text-[#D4AF37] animate-pulse" />
          <span className="text-[10px] font-semibold text-slate-300 font-mono tracking-wide">
            Clipboard secured: password for <span className="text-white font-bold">{activeClipboardTimer.label}</span> copied. Clear in <span className="text-[#D4AF37] font-bold">{secondsLeft}s</span>
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Integrity active" />
        </div>
      </div>

    </div>
  );
}
