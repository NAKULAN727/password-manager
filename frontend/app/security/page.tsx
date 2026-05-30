'use client';

import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageLayout } from '../../components/ui/PageLayout';
import { ArrowLeft, Shield, Eye, Lock, Clock, Users, FileText, Monitor } from 'lucide-react';

/**
 * Security Page — Explains Sphynx's security philosophy.
 * Covers zero-knowledge design, threat model, local encryption,
 * session security, guardian recovery security, audit logs,
 * recovery cooldowns, and trusted devices.
 */
export default function SecurityPage() {
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
            How Sphynx{' '}
            <span className="bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              Protects You
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Security isn't a feature — it's the foundation. Every design decision in Sphynx starts with the question: "What if the server is compromised?"
          </p>
        </div>

        {/* Zero-Knowledge Design */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-[#D4AF37]/10 p-2.5 border border-[#D4AF37]/20 text-[#D4AF37]">
              <Eye size={20} />
            </div>
            <h2 className="text-2xl font-bold">Zero-Knowledge Design</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Sphynx is built on a zero-knowledge architecture. This means the server stores your data but can never read it. Even if an attacker gains full database access, they get nothing useful.
              </p>
              <ul className="text-sm text-slate-400 leading-relaxed space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Encryption and decryption happen exclusively in your browser
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  The server never receives your encryption keys
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Plaintext credentials never travel over the network
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Server operators cannot access your vault contents
                </li>
              </ul>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">What the Server Sees</h4>
              <div className="space-y-3">
                <div className="rounded-lg border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Your wallet address</span>
                  <span className="text-[10px] text-emerald-400 font-mono">public</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Encrypted vault blobs</span>
                  <span className="text-[10px] text-[#D4AF37] font-mono">encrypted</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Encrypted key material</span>
                  <span className="text-[10px] text-[#D4AF37] font-mono">encrypted</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Your actual passwords</span>
                  <span className="text-[10px] text-red-400 font-mono">never</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Threat Model */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-red-500/10 p-2.5 border border-red-500/20 text-red-400">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-bold">Threat Model</h2>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl">
            Sphynx is designed to protect against the following threat scenarios:
          </p>

          <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
            {[
              { threat: 'Server database breach', mitigation: 'All stored data is encrypted. Keys are never on the server.' },
              { threat: 'Man-in-the-middle attacks', mitigation: 'Encryption happens client-side. Intercepted data is useless ciphertext.' },
              { threat: 'Malicious server operator', mitigation: 'Zero-knowledge design means operators cannot read vault contents.' },
              { threat: 'Session hijacking', mitigation: 'JWTs expire quickly. Vault requires re-derivation of keys from wallet.' },
              { threat: 'XSS attacks', mitigation: 'CryptoKeys are non-extractable. Even injected scripts cannot read key material.' },
              { threat: 'Replay attacks', mitigation: 'Single-use nonces with 90-second expiry prevent signature reuse.' },
            ].map((item) => (
              <div key={item.threat} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <h4 className="text-sm font-bold text-white mb-1.5">{item.threat}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.mitigation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Local Encryption */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400">
              <Lock size={20} />
            </div>
            <h2 className="text-2xl font-bold">Local Encryption</h2>
          </div>

          <div className="max-w-3xl">
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              All cryptographic operations use the Web Crypto API with AES-256-GCM. Keys are derived using HKDF and marked as non-extractable, meaning even JavaScript running in the same page cannot access the raw key bytes.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Each vault entry is encrypted with a unique initialization vector (IV), ensuring that identical passwords produce different ciphertexts. The GCM mode provides both confidentiality and integrity — any tampering with the ciphertext is detected during decryption.
            </p>
          </div>
        </section>

        {/* Session Security */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20 text-amber-400">
              <Clock size={20} />
            </div>
            <h2 className="text-2xl font-bold">Session Security</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Auto-Lock</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The vault automatically locks after a period of inactivity. Derived keys are purged from memory, requiring re-authentication.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Clipboard Purge</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Copied passwords are automatically cleared from the clipboard after a countdown, preventing accidental exposure.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Tamper Detection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The vault monitors for signs of tampering or unauthorized access attempts and alerts the user immediately.
              </p>
            </Card>
          </div>
        </section>

        {/* Guardian Recovery Security */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-blue-500/10 p-2.5 border border-blue-500/20 text-blue-400">
              <Users size={20} />
            </div>
            <h2 className="text-2xl font-bold">Guardian Recovery Security</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The guardian recovery system is designed so that no single guardian can access your vault. Recovery requires a threshold of approvals from your designated circle.
              </p>
              <ul className="text-sm text-slate-400 leading-relaxed space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Guardians never see your credentials or key material
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Recovery shares are encrypted before storage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  Threshold requirement prevents single-guardian compromise
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  All recovery events are logged in an immutable audit trail
                </li>
              </ul>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Recovery Cooldowns</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 p-3">
                  <span className="text-xs text-slate-300">Approval processing delay</span>
                  <span className="text-xs text-[#D4AF37] font-mono font-bold">24 hours</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 p-3">
                  <span className="text-xs text-slate-300">Guardian approval expiry</span>
                  <span className="text-xs text-[#D4AF37] font-mono font-bold">48 hours</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 p-3">
                  <span className="text-xs text-slate-300">Global recovery cooldown</span>
                  <span className="text-xs text-[#D4AF37] font-mono font-bold">7 days</span>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-4">
                These cooldowns give you time to detect and cancel unauthorized recovery attempts.
              </p>
            </Card>
          </div>
        </section>

        {/* Audit Logs & Trusted Devices */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-fit rounded-xl bg-purple-500/10 p-2.5 border border-purple-500/20 text-purple-400">
                  <FileText size={20} />
                </div>
                <h2 className="text-2xl font-bold">Audit Logs</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Every security-relevant action is recorded in an immutable audit trail. This includes authentication events, recovery requests, guardian changes, and device registrations.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Audit logs cannot be modified or deleted, providing a complete history of all activity on your account.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-fit rounded-xl bg-cyan-500/10 p-2.5 border border-cyan-500/20 text-cyan-400">
                  <Monitor size={20} />
                </div>
                <h2 className="text-2xl font-bold">Trusted Devices</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Sphynx tracks which devices have accessed your vault. You can review active sessions and revoke access from any device at any time.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                New device logins trigger additional verification steps, and you're notified of any unusual access patterns.
              </p>
            </div>
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
