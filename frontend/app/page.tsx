'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Shield, Key, ChevronRight, Zap, Database } from 'lucide-react';

/**
 * Premium, interactive Obsidian landing page introducing the zero-knowledge
 * blockchain credential vault model.
 */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090D16]">
      
      {/* Premium ambient high-fidelity pulsing glows with Burnished Gold accents */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-[#D4AF37]/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-emerald-500/2 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      {/* Navigation Header */}
      <header className="border-b border-white/5 bg-[#090D16]/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3 bg-transparent p-1">
            <Image
              src="/logo-web-redesigned.png"
              alt="Sphynx Logomark"
              width={34}
              height={34}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.2)] transition-transform duration-300 hover:scale-105"
              priority
            />
            <Image
              src="/logo-password.png"
              alt="Sphynx Logo"
              width={110}
              height={44}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]"
              priority
            />
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="secondary" className="px-5 py-2 text-xs font-bold border-[#D4AF37]/15 hover:border-[#D4AF37]/45 text-[#D4AF37] hover:text-white">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-32">
        <div className="flex flex-col items-center text-center animate-fade-in">
          
          {/* Next-gen Tagline Pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)] font-mono">
            <Zap size={12} />
            NEXT-GEN WEB3 SECURITY
          </div>

          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl leading-tight sm:leading-none">
            The Zero-Knowledge <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent font-mono">
              Sanctuary
            </span>{" "}
            for Your Credentials
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-slate-400 sm:text-xl leading-relaxed">
            A decentralized, password-less credential locker secured by cryptographic EIP-4361 Sign-In with Ethereum. 100% private. Zero server trust required.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Link href="/login">
              <Button 
                variant="primary" 
                className="gap-2 px-8 py-4 text-base font-bold group"
              >
                Access Vault
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            
            <a href="#features">
              <Button variant="secondary" className="px-8 py-4 text-base font-semibold border-white/5 hover:border-white/15">
                Explore Tech
              </Button>
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <section id="features" className="mt-32 sm:mt-48 border-t border-white/5 pt-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Engineered for Absolute Confidentiality
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              We replace centralized auth and database architectures with cryptographic math and local client encryption.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="flex flex-col gap-5 border-[#D4AF37]/10 bg-[#090D16]/50">
              <div className="w-fit rounded-2xl bg-[#D4AF37]/10 p-4 border border-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold">Sign-In with Ethereum</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Uses cryptographic digital signatures via MetaMask (EIP-4361). Authenticate safely without central passwords, emails, or single-point weaknesses.
              </p>
            </Card>

            <Card className="flex flex-col gap-5 border-[#D4AF37]/10 bg-[#090D16]/50">
              <div className="w-fit rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Key size={28} />
              </div>
              <h3 className="text-xl font-bold">Zero-Knowledge Trust</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Your vault's master encryption keys never travel through networks or land on any server. Decryption occurs strictly inside your browser.
              </p>
            </Card>

            <Card className="flex flex-col gap-5 border-[#D4AF37]/10 bg-[#090D16]/50">
              <div className="w-fit rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Database size={28} />
              </div>
              <h3 className="text-xl font-bold">Ephemeral Nonces</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Backend nonces are cryptographically random, single-use, and expire in 90 seconds. Protects against intercept and replay attacks instantly.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#090D16] py-10 mt-32 text-center text-xs text-white/30 tracking-wider font-mono">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <p>© {new Date().getFullYear()} Sphynx Security Labs. All cryptographic rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
