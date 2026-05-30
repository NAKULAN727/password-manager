'use client';

import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared page layout wrapper for all public-facing marketing pages.
 * Includes the Navbar and Footer with the Obsidian Sanctuary ambient glows.
 */
export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090D16]">
      {/* Premium ambient pulsing glows */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-[#D4AF37]/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-emerald-500/2 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
