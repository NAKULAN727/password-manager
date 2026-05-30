'use client';

import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageLayout } from '../components/ui/PageLayout';
import { Shield, Lock, Users, Globe, ChevronRight, ArrowRight } from 'lucide-react';

/**
 * Sphynx Homepage — Simple, approachable introduction to the product.
 * No technical jargon. Focuses on what Sphynx is, why it exists,
 * the problem it solves, and the benefits for users.
 */
export default function HomePage() {
  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-36">
        <div className="flex flex-col items-center text-center animate-fade-in">
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl leading-tight sm:leading-none">
            Your Digital{' '}
            <span className="bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              Sanctuary
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-slate-400 sm:text-xl leading-relaxed">
            Store, protect, and access your credentials from one secure place.
            Private by default. No passwords to remember. Always under your control.
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

            <Link href="/technology">
              <Button variant="secondary" className="px-8 py-4 text-base font-semibold border-white/5 hover:border-white/15">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-8 border-t border-white/5 pt-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Passwords Are Broken
          </h2>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">
            You manage dozens — maybe hundreds — of accounts. Passwords are hard to remember,
            easy to reuse, and scattered across browsers and devices. Security shouldn't require
            a degree in cryptography.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-3xl font-bold text-[#D4AF37]">80%</p>
            <p className="mt-2 text-xs text-slate-400">of breaches involve weak or reused passwords</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-3xl font-bold text-[#D4AF37]">100+</p>
            <p className="mt-2 text-xs text-slate-400">average accounts per person</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-3xl font-bold text-[#D4AF37]">0</p>
            <p className="mt-2 text-xs text-slate-400">passwords you need to remember with Sphynx</p>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-8 mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            One Vault. Complete Control.
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-lg">
            Sphynx gives you a single, secure place for all your credentials — without trusting anyone else with your data.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {[
            { title: 'Secure Credential Storage', desc: 'All your passwords and secrets encrypted and stored safely in one place.' },
            { title: 'Private Access', desc: 'Sign in with your wallet. No emails, no master passwords, no third parties.' },
            { title: 'Browser Autofill', desc: 'Fill credentials automatically on any website with the Sphynx extension.' },
            { title: 'Recovery Options', desc: 'Designate trusted guardians who can help you recover access if needed.' },
            { title: 'User Ownership', desc: 'You own your data. The server never sees your passwords — ever.' },
            { title: 'Cross-Device Access', desc: 'Access your vault from any device with your wallet connected.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Users Choose Sphynx */}
      <section className="mx-auto max-w-7xl px-6 sm:px-8 mt-32 border-t border-white/5 pt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Why Users Choose Sphynx
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col gap-4 border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
            <div className="w-fit rounded-2xl bg-[#D4AF37]/10 p-3 border border-[#D4AF37]/20 text-[#D4AF37]">
              <Lock size={22} />
            </div>
            <h3 className="text-base font-bold">Private by Design</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Your credentials are encrypted on your device before anything is stored. The server never has access to your secrets.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
            <div className="w-fit rounded-2xl bg-emerald-500/10 p-3 border border-emerald-500/20 text-emerald-400">
              <Shield size={22} />
            </div>
            <h3 className="text-base font-bold">Wallet-Based Access</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              No master password to forget. Sign in securely with your existing crypto wallet — simple and phishing-resistant.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
            <div className="w-fit rounded-2xl bg-amber-500/10 p-3 border border-amber-500/20 text-amber-400">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold">Guardian Recovery</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Designate trusted people as recovery guardians. If you lose access, they help you get back in — no single point of failure.
            </p>
          </Card>

          <Card className="flex flex-col gap-4 border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
            <div className="w-fit rounded-2xl bg-blue-500/10 p-3 border border-blue-500/20 text-blue-400">
              <Globe size={22} />
            </div>
            <h3 className="text-base font-bold">Browser Autofill</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              The Sphynx browser extension fills your credentials automatically. Fast, seamless, and secure on every site you visit.
            </p>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 sm:px-8 mt-32 mb-12">
        <div className="rounded-3xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.03] p-12 sm:p-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            Ready to Secure Your Credentials?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            Join Sphynx and take full ownership of your digital identity. No emails, no master passwords, no compromises.
          </p>
          <Link href="/login">
            <Button variant="primary" className="gap-2 px-8 py-4 text-base font-bold group">
              Access Vault
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
