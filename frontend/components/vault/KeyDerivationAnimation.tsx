'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';

/**
 * KeyDerivationAnimation visualizes the local cryptographic key expansion.
 * Gold particles orbit in a wide spiral and gradually contract/converge
 * toward the central vault core as the progress reaches 100%.
 * Technical jargon is replaced with elegant, reassurance-focused messages.
 */
export function KeyDerivationAnimation() {
  const [step, setStep] = useState(0);

  // Cycle through cryptographic reassurance steps
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
    { text: 'Securing channel with local identity signature...', progress: 30 },
    { text: 'Deriving custom cryptographic keys in memory...', progress: 65 },
    { text: 'Isolating credential vaults locally...', progress: 95 },
    { text: 'Verifying sanctuary vault integrity...', progress: 100 }
  ];

  const currentStep = stepsInfo[step] || stepsInfo[3];
  const progress = currentStep.progress;

  // Render 12 golden particles that contract as progress increases
  const totalParticles = 12;
  const particles = Array.from({ length: totalParticles }).map((_, i) => {
    const startAngle = (i * 2 * Math.PI) / totalParticles;
    // Vary initial orbits slightly
    const startRadius = 80 + (i % 3) * 8; 
    
    // Calculate radius contraction
    const currentRadius = startRadius * (1 - (progress / 100) * 0.8);
    // Add rotational offset based on progress to create spiral effect
    const currentAngle = startAngle + (progress / 100) * Math.PI * 2.5;

    const x = Math.cos(currentAngle) * currentRadius;
    const y = Math.sin(currentAngle) * currentRadius;

    return { id: i, x, y };
  });

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#090D16]/90 backdrop-blur-2xl rounded-3xl border border-[#D4AF37]/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm mx-auto select-none">
      
      {/* Visual Orbiting and Convergence Area */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        
        {/* Core Shield / Key Lock */}
        <motion.div 
          animate={{ 
            scale: [1, 1.04, 1],
            boxShadow: [
              '0 0 20px rgba(212,175,55,0.15)',
              '0 0 35px rgba(212,175,55,0.3)',
              '0 0 20px rgba(212,175,55,0.15)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 w-16 h-16 rounded-full bg-[#090D16] border border-[#D4AF37]/40 flex items-center justify-center"
        >
          <KeyRound className="h-6 w-6 text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
        </motion.div>

        {/* Ambient Halo Rings */}
        <div className="absolute w-24 h-24 rounded-full border border-[#D4AF37]/10" />
        <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#D4AF37]/5" />
        <div className="absolute w-44 h-44 rounded-full border border-dotted border-white/5" />

        {/* Converging Golden Particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            animate={{ x: p.x, y: p.y }}
            transition={{ type: 'spring', stiffness: 45, damping: 12 }}
            className="absolute w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
          />
        ))}
      </div>

      {/* Progress & Reassurance State */}
      <div className="w-full text-center">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2 font-mono">
          Securing Access Gateway
        </h4>
        
        {/* Depleting progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-5 border border-white/5">
          <motion.div 
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-500 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
          />
        </div>

        {/* Reassurance logger status */}
        <div className="min-h-[40px] px-2 flex items-center justify-center">
          <motion.p 
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-slate-400 font-mono leading-relaxed"
          >
            {currentStep.text}
          </motion.p>
        </div>
      </div>

    </div>
  );
}
