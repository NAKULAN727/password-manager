'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DecryptedPasswordProps {
  password?: string;
  isDecrypted: boolean;
}

export function DecryptedPassword({ password = '', isDecrypted }: DecryptedPasswordProps) {
  const [animating, setAnimating] = useState(false);
  const [mutatedText, setMutatedText] = useState('');
  
  // Characters used for the decryption mutation/scramble effect
  const mutationChars = '•#*@&%$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  useEffect(() => {
    if (isDecrypted) {
      setAnimating(true);
      const displayLength = password.length > 0 ? password.length : 12;

      // Mutation interval: scrambles text at a high speed
      const intervalId = setInterval(() => {
        let scrambled = '';
        for (let i = 0; i < displayLength; i++) {
          scrambled += mutationChars[Math.floor(Math.random() * mutationChars.length)];
        }
        setMutatedText(scrambled);
      }, 45);

      // Settle text after 800ms shimmer sweep
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        setAnimating(false);
      }, 750);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    } else {
      setAnimating(false);
      setMutatedText('');
    }
  }, [isDecrypted, password]);

  return (
    <div className="relative overflow-hidden inline-flex items-center min-h-[26px]">
      <AnimatePresence mode="wait">
        {!isDecrypted ? (
          /* Locked State - Bullet placeholder with subtle entry */
          <motion.span
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-white select-none tracking-widest font-sans font-medium text-[13px] px-2 py-0.5"
          >
            ••••••••••••
          </motion.span>
        ) : animating ? (
          /* Decrypting Scramble Transition State */
          <motion.span
            key="decrypting"
            initial={{ filter: 'blur(4px)', opacity: 0.7 }}
            animate={{ filter: 'blur(0px)', opacity: 1 }}
            exit={{ filter: 'blur(2px)', opacity: 0.8 }}
            transition={{ duration: 0.6 }}
            className="font-mono text-xs font-bold text-[#D4AF37] px-2.5 py-1 rounded bg-[#090D16]/50 border border-[#D4AF37]/20 shadow-[0_0_12px_rgba(212,175,55,0.15)] select-none relative"
          >
            {mutatedText}
            {/* Shimmer sweep overlay */}
            <motion.span
              initial={{ left: '-100%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent pointer-events-none"
            />
          </motion.span>
        ) : (
          /* Decrypted Plaintext State */
          <motion.span
            key="decrypted"
            initial={{ opacity: 0, filter: 'blur(3px)', scale: 0.98 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="font-mono text-xs font-semibold px-2.5 py-1.5 rounded bg-[#090D16]/80 border border-[#10B981]/25 text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.15)] select-all flex items-center gap-1.5 max-w-fit cursor-pointer"
          >
            <ShieldCheck size={12.5} className="text-[#10B981] shrink-0 animate-pulse" />
            {password}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
