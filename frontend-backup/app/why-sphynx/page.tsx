'use client';

import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageLayout } from '../../components/ui/PageLayout';
import { ArrowLeft, Shield, Key, Users, CheckCircle2, X, Minus } from 'lucide-react';

/**
 * Why Sphynx Page — Explains differences and advantages.
 * Covers why Sphynx exists, comparisons with traditional and browser
 * password managers, wallet authentication benefits, user ownership,
 * and recovery design.
 */
export default function WhySphynxPage() {
  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-24 animate-fade-in">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37] hover:text-white transition-colors mb-12">
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        {/* Page Header */}
        <div className="max-w-3xl mb-20">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Why{' '}
            <span className="bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              Sphynx
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Password managers have existed for years. Here's why we built something different — and why it matters for your security.
          </p>
        </div>

        {/* Why Sphynx Exists */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold mb-6">Why Sphynx Exists</h2>
          <div className="max-w-3xl">
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Traditional password managers ask you to trust a company with your most sensitive data. They store your encrypted vault on their servers, protected by a master password. If that company is breached, your security depends entirely on the strength of that single password.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Browser-based password managers are convenient but offer minimal security guarantees. They're tied to a single ecosystem, lack proper encryption architecture, and provide no recovery options beyond email resets.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sphynx was built to solve both problems: provide the convenience of a modern password manager with the security guarantees of cryptographic key management — without requiring you to trust anyone.
            </p>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <h2 className="text-2xl font-bold mb-8">How Sphynx Compares</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Feature</th>
                  <th className="text-center py-4 px-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Traditional PM</th>
                  <th className="text-center py-4 px-4 text-xs font-semibold text-white/60 uppercase tracking-wider">Browser PM</th>
                  <th className="text-center py-4 px-4 text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Sphynx</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { feature: 'Zero-knowledge encryption', traditional: 'partial', browser: false, sphynx: true },
                  { feature: 'No master password needed', traditional: false, browser: false, sphynx: true },
                  { feature: 'Client-side only decryption', traditional: 'partial', browser: false, sphynx: true },
                  { feature: 'Social recovery', traditional: false, browser: false, sphynx: true },
                  { feature: 'Cross-browser support', traditional: true, browser: false, sphynx: true },
                  { feature: 'No email required', traditional: false, browser: false, sphynx: true },
                  { feature: 'Open architecture', traditional: 'partial', browser: false, sphynx: true },
                  { feature: 'Phishing-resistant auth', traditional: false, browser: 'partial', sphynx: true },
                  { feature: 'User owns encryption keys', traditional: false, browser: false, sphynx: true },
                  { feature: 'Decentralized recovery', traditional: false, browser: false, sphynx: true },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-xs text-slate-300">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.traditional === true ? <CheckCircle2 size={14} className="text-emerald-400 mx-auto" /> :
                       row.traditional === false ? <X size={14} className="text-red-400/60 mx-auto" /> :
                       <Minus size={14} className="text-amber-400/60 mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.browser === true ? <CheckCircle2 size={14} className="text-emerald-400 mx-auto" /> :
                       row.browser === false ? <X size={14} className="text-red-400/60 mx-auto" /> :
                       <Minus size={14} className="text-amber-400/60 mx-auto" />}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.sphynx === true ? <CheckCircle2 size={14} className="text-emerald-400 mx-auto" /> :
                       row.sphynx === false ? <X size={14} className="text-red-400/60 mx-auto" /> :
                       <Minus size={14} className="text-amber-400/60 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Wallet Authentication Benefits */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-[#D4AF37]/10 p-2.5 border border-[#D4AF37]/20 text-[#D4AF37]">
              <Key size={20} />
            </div>
            <h2 className="text-2xl font-bold">Wallet Authentication Benefits</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">No Password to Forget</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your wallet is your identity. No master password means no risk of forgetting it, and no password to be phished or brute-forced.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Cryptographic Proof</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wallet signatures provide mathematical proof of identity. Unlike passwords, they cannot be guessed, leaked from a database, or intercepted.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Hardware Security</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hardware wallets (Ledger, Trezor) keep your signing keys in a secure element. Authentication becomes as secure as your physical device.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">No Central Authority</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                No company controls your access. Your wallet is yours — no account lockouts, no service dependencies, no terms of service changes.
              </p>
            </Card>
          </div>
        </section>

        {/* User Ownership */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-bold">True User Ownership</h2>
          </div>

          <div className="max-w-3xl">
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              With Sphynx, you don't just use the service — you own your data in the strongest possible sense:
            </p>
            <ul className="text-sm text-slate-400 leading-relaxed space-y-3 ml-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span><span className="text-white font-semibold">Key ownership</span> — Only your wallet can derive the keys that decrypt your vault. No admin backdoor exists.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span><span className="text-white font-semibold">Data portability</span> — Your encrypted vault can be exported. You're never locked into the platform.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span><span className="text-white font-semibold">No account deletion risk</span> — Your access is tied to your wallet, not to a company's decision to keep your account active.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span><span className="text-white font-semibold">Censorship resistance</span> — No entity can prevent you from accessing your own credentials.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Recovery Design */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-blue-500/10 p-2.5 border border-blue-500/20 text-blue-400">
              <Users size={20} />
            </div>
            <h2 className="text-2xl font-bold">Recovery Design</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The biggest criticism of self-custody solutions is: "What if I lose my keys?" Sphynx solves this with a social recovery system inspired by multi-signature wallets.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                You designate a circle of trusted guardians — friends, family, or colleagues — who can collectively help you recover access. No single guardian has enough information to access your vault alone.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                The system includes time-locked cooldowns, expiring approvals, and a complete audit trail to prevent abuse. You maintain full visibility and can cancel any recovery attempt.
              </p>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Recovery vs. Traditional Reset</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-red-400/80 font-semibold mb-1">Traditional: Email Reset</p>
                  <p className="text-[11px] text-slate-400">Anyone who compromises your email can reset your password manager. Single point of failure.</p>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-xs text-emerald-400 font-semibold mb-1">Sphynx: Guardian Recovery</p>
                  <p className="text-[11px] text-slate-400">Requires multiple trusted parties to approve. Time-locked. Auditable. No single point of failure.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <div className="flex items-center gap-4 pt-8 border-t border-white/5">
          <Link href="/">
            <Button variant="outline" className="gap-2 text-xs px-5 py-3">
              <ArrowLeft size={14} />
              Back to Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" className="gap-2 text-xs px-5 py-3">
              Access Vault
            </Button>
          </Link>
        </div>
      </main>
    </PageLayout>
  );
}
