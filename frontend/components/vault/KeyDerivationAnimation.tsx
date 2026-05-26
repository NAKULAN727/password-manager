'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, KeyRound, ServerCrash } from 'lucide-react';

/**
 * KeyDerivationAnimation visualizes the local cryptographic PBKDF2 & HKDF 
 * key expansion process during vault sign-in.
 */
export function KeyDerivationAnimation() {
  const [step, setStep] = useState(0);

  // Cycle through technical cryptographic phases for maximum visual feedback
  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 1200);
    const timer2 = setTimeout(() => setStep(2), 2400);
    const timer3 = setTimeout(() => setStep(3), 3600);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const stepsInfo = [
    { text: 'Running PBKDF2 key stretching (600,000 rounds)...', progress: 30 },
    { text: 'Expanding wallet signature with SHA-256 (S_wallet)...', progress: 65 },
    { text: 'Finalizing HKDF AES-256-GCM derivation (extractable: false)...', progress: 95 },
    { text: 'Injecting non-extractable keys into browser memory...', progress: 100 }
  ];

  const currentStep = stepsInfo[step] || stepsInfo[3];

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#090D16]/90 backdrop-blur-2xl rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.05)] w-full max-w-sm mx-auto animate-fade-in select-none">
      
      {/* Visual Orbiting Canvas Area */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        
        {/* Core Shield / Key Lock */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/40 border border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse">
          <KeyRound className="h-7 w-7 text-[#D4AF37]" />
        </div>

        {/* Core Halo rings */}
        <div className="absolute w-24 h-24 rounded-full border border-[#D4AF37]/25 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#D4AF37]/10" />
        <div className="absolute w-44 h-44 rounded-full border border-dotted border-[#D4AF37]/5" />

        {/* Orbiting Particle Layer 1 */}
        <div className="absolute w-full h-full animate-orbit-1 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_12px_#D4AF37] transform -translate-x-[30px]" />
        </div>

        {/* Orbiting Particle Layer 2 */}
        <div className="absolute w-full h-full animate-orbit-2 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] opacity-85 transform translate-x-[45px]" />
        </div>

        {/* Orbiting Particle Layer 3 */}
        <div className="absolute w-full h-full animate-orbit-3 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37] opacity-60 transform -translate-y-[60px]" />
        </div>
      </div>

      {/* Progress & Metadata */}
      <div className="w-full text-center">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-1.5">
          HKDF Expansion Active
        </h4>
        
        {/* Depleting progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4 border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-500 transition-all duration-1000 ease-out"
            style={{ width: `${currentStep.progress}%` }}
          />
        </div>

        {/* Animated Phase Logger */}
        <div className="min-h-[40px] px-2">
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed animate-pulse">
            {currentStep.text}
          </p>
        </div>
      </div>

    </div>
  );
}
