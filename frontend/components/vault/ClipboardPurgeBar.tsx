'use client';

import React, { useEffect, useState } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ClipboardPurgeBar displays a hardware-accelerated depleting gold progress bar
 * at the top of the screen when a secret is copied, along with a floating
 * status panel that slides in and out using Framer Motion.
 */
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
    
    setProgress(100);
    setSecondsLeft(Math.ceil(duration / 1000));

    // Update remaining fraction at high frequency for fluid visuals
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
    }, 80);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeClipboardTimer, setActiveClipboardTimer]);

  const isActive = !!activeClipboardTimer && progress > 0;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="fixed top-0 left-0 w-full z-[9999] pointer-events-none"
        >
          {/* Depleting Burnished Gold Progress Line */}
          <div className="w-full h-[3px] bg-[#090D16]/50">
            <motion.div 
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.08, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] shadow-[0_1px_10px_rgba(212,175,55,0.7)]"
            />
          </div>

          {/* Floating mini glassmorphic secure clipboard status panel */}
          <div className="flex justify-center mt-3">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#090D16]/95 border border-[#D4AF37]/25 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.6)] select-none pointer-events-auto cursor-default"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-[#D4AF37] animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-300 font-mono tracking-wide">
                Clipboard Ephemeral: password for <span className="text-white font-bold">{activeClipboardTimer.label}</span> copied. Wiping in <span className="text-[#D4AF37] font-bold font-mono">{secondsLeft}s</span>
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Security Active" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
