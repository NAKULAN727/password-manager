'use client';

import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared page layout wrapper — The Vault theme.
 * Warm radial background with subtle amber glow from top-left.
 */
export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Warm ambient glow — like a lamp inside a vault */}
      <div className="fixed top-[-20%] left-[-10%] -z-10 h-[700px] w-[700px] rounded-full bg-[#E8A020]/[0.03] blur-[150px] animate-pulse-glow" />
      <div className="fixed bottom-[-20%] right-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-[#B86A1A]/[0.02] blur-[140px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
