import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

/**
 * Card component — The Vault theme.
 * Warm surface with amber-tinted shadows and subtle hover glow.
 */
export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[#2A1E10] bg-[#141009] p-8 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[rgba(232,160,32,0.3)] ${glow ? 'shadow-[0_0_50px_rgba(232,160,32,0.06),0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_60px_rgba(232,160,32,0.12),0_8px_30px_rgba(0,0,0,0.5)]' : 'shadow-[0_0_30px_rgba(232,160,32,0.05),0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_40px_rgba(232,160,32,0.1),0_8px_30px_rgba(0,0,0,0.5)]'} ${className}`}>
      {children}
    </div>
  );
}
