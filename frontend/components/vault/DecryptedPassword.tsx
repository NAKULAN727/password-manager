'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

interface DecryptedPasswordProps {
  password?: string;
  isDecrypted: boolean;
}

export function DecryptedPassword({ password = '', isDecrypted }: DecryptedPasswordProps) {
  const [animating, setAnimating] = useState(false);
  const [mutatedText, setMutatedText] = useState('');
  
  // Characters used for the decryption mutation effect
  const mutationChars = 'ABCDEF0123456789!@#$%^&*()_+{}|:<>?';

  useEffect(() => {
    if (isDecrypted) {
      setAnimating(true);
      
      // Determine length of characters to show during mutation
      const displayLength = password.length > 0 ? password.length : 12;

      // Scramble / mutate text at high frequency (50ms interval)
      const intervalId = setInterval(() => {
        let scrambled = '';
        for (let i = 0; i < displayLength; i++) {
          scrambled += mutationChars[Math.floor(Math.random() * mutationChars.length)];
        }
        setMutatedText(scrambled);
      }, 50);

      // Resolve back to clear plaintext after 800ms
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        setAnimating(false);
      }, 800);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    } else {
      setAnimating(false);
      setMutatedText('');
    }
  }, [isDecrypted, password]);

  if (!isDecrypted) {
    return (
      <span className="text-white/20 select-none tracking-widest font-sans font-medium text-[13px]">
        ••••••••••••
      </span>
    );
  }

  if (animating) {
    return (
      <span className="font-mono text-xs font-bold text-[#D4AF37] blur-[4px] select-none shimmer-bg rounded px-2 py-0.5 border border-[#D4AF37]/20 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
        {mutatedText}
      </span>
    );
  }

  return (
    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-[#090D16]/80 border border-emerald-500/20 text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.15)] select-all animate-fade-in flex items-center gap-1.5 max-w-fit">
      <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
      {password}
    </span>
  );
}
