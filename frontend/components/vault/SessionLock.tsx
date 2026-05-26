'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Button } from '../ui/Button';
import { AlertTriangle, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * High-fidelity session monitoring component that listens to user interactions,
 * displays countdown warnings during inactivity timeouts, and purges all key
 * materials instantly upon countdown completion. Refactored with Framer Motion.
 */
export function SessionLock() {
  const { isUnlocked, lockVault } = useVaultStore();
  
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 minutes = 180 seconds
  const [showWarning, setShowWarning] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity limits
  const INACTIVITY_LIMIT = 180;
  const WARNING_THRESHOLD = 30;

  const resetTimer = () => {
    if (!isUnlocked) return;
    
    // Clear existing timer handlers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setSecondsRemaining(INACTIVITY_LIMIT);
    setShowWarning(false);

    // Register primary inactivity trigger: fires WARNING_THRESHOLD seconds before lock
    timerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(WARNING_THRESHOLD);
      
      let count = WARNING_THRESHOLD;
      
      // Start 1-second countdown ticks
      countdownRef.current = setInterval(() => {
        count--;
        setSecondsRemaining(count);
        
        if (count <= 0) {
          clearInterval(countdownRef.current!);
          lockVault(); // Purge vault and wipe key material immediately
          setShowWarning(false);
        }
      }, 1000);

    }, (INACTIVITY_LIMIT - WARNING_THRESHOLD) * 1000);
  };

  useEffect(() => {
    if (isUnlocked) {
      resetTimer();

      // Monitor keyboard, mouse, click, and scroll interactions
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click'];
      const onActivity = () => resetTimer();

      events.forEach(event => {
        window.addEventListener(event, onActivity);
      });

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        events.forEach(event => {
          window.removeEventListener(event, onActivity);
        });
      };
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setShowWarning(false);
    }
  }, [isUnlocked]);

  return (
    <AnimatePresence>
      {isUnlocked && showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Background glass blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetTimer}
            className="absolute inset-0 bg-[#090D16]/80 backdrop-blur-md"
          />

          {/* Warning Box Container */}
          <motion.div 
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-yellow-500/15 bg-[#090D16]/95 p-8 shadow-[0_0_50px_rgba(234,179,8,0.12)] backdrop-blur-2xl z-10 text-center"
          >
            
            {/* Ambient background light */}
            <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-yellow-500/5 blur-[50px]" />
            
            {/* Warning Indicator */}
            <motion.div 
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              className="mx-auto w-fit mb-4 rounded-2xl bg-yellow-500/10 p-3.5 text-yellow-500 border border-yellow-500/20"
            >
              <AlertTriangle className="h-6 w-6" />
            </motion.div>

            <h3 className="text-lg font-bold text-[#F8F3E7] mb-2 font-mono">Vault Lock Warning</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Your credentials vault will automatically lock in{' '}
              <span className="text-yellow-400 font-mono font-bold text-sm bg-yellow-950/20 px-2.5 py-0.5 rounded border border-yellow-500/10 shadow-md">
                {secondsRemaining}s
              </span>{' '}
              due to inactivity.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                onClick={resetTimer}
                className="w-full gap-1.5 py-3.5 text-xs font-bold border-yellow-500/35 hover:border-yellow-500 text-white bg-[#090D16] hover:bg-[#1E1B10] shadow-[0_0_15px_rgba(234,179,8,0.15)] transition-all"
              >
                <Unlock size={13} />
                Extend Vault Session
              </Button>
              
              <button
                onClick={() => {
                  lockVault();
                  setShowWarning(false);
                }}
                className="text-xs font-semibold text-white/35 hover:text-white transition-colors"
              >
                Lock Vault Now
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
