import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[#1E2B42] bg-[#0C1424]/90 p-8 transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(.23,1,.32,1)] hover:-translate-y-0.5 hover:border-[#6EE7FF]/25 ${glow ? 'shadow-[0_18px_55px_rgba(0,0,0,.32),0_0_35px_rgba(110,231,255,.06)]' : 'shadow-[0_14px_40px_rgba(0,0,0,.22)]'} ${className}`}>
      {children}
    </div>
  );
}
