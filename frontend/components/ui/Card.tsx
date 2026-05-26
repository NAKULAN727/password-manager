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
    <div className={`group relative overflow-hidden rounded-3xl border border-[#D4AF37]/10 bg-[#090D16]/65 p-8 backdrop-blur-2xl transition-all duration-500 hover:border-[#D4AF37]/25 hover:bg-[#090D16]/75 ${glow ? 'shadow-[0_0_50px_rgba(212,175,55,0.06)] hover:shadow-[0_0_60px_rgba(212,175,55,0.15)]' : 'shadow-2xl'} ${className}`}>
      
      {/* Decorative high-fidelity neon ambient light (Top Right Corner) - Burnished Gold */}
      <div className="absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full bg-[#D4AF37]/5 blur-[80px] transition-all duration-500 group-hover:bg-[#D4AF37]/12 group-hover:blur-[60px]" />
      
      {/* Decorative high-fidelity neon ambient light (Bottom Left Corner) - Emerald Pulse */}
      <div className="absolute -bottom-20 -left-20 -z-10 h-40 w-40 rounded-full bg-[#10B981]/2 blur-[80px] transition-all duration-500 group-hover:bg-[#10B981]/6 group-hover:blur-[60px]" />

      {children}
    </div>
  );
}
