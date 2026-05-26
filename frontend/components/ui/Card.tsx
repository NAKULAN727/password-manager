import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

/**
 * Reusable obsidian glassmorphism card component with dynamic background glows,
 * multi-layered borders, and high-fidelity shadow states.
 */
export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-2xl transition-all duration-500 hover:border-white/10 hover:bg-white/[0.04] ${glow ? 'shadow-[0_0_50px_rgba(127,0,255,0.1)] hover:shadow-[0_0_60px_rgba(127,0,255,0.2)]' : 'shadow-2xl'} ${className}`}>
      
      {/* Decorative high-fidelity neon ambient light (Top Right Corner) */}
      <div className="absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full bg-[#7F00FF]/5 blur-[80px] transition-all duration-500 group-hover:bg-[#7F00FF]/15 group-hover:blur-[60px]" />
      
      {/* Decorative high-fidelity neon ambient light (Bottom Left Corner) */}
      <div className="absolute -bottom-20 -left-20 -z-10 h-40 w-40 rounded-full bg-[#00F2FE]/3 blur-[80px] transition-all duration-500 group-hover:bg-[#00F2FE]/10 group-hover:blur-[60px]" />

      {children}
    </div>
  );
}
