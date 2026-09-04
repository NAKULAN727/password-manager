'use client';

import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageLayout } from '../../components/ui/PageLayout';
import { ArrowLeft, Shield, Key, Database, Layers, Globe, Lock } from 'lucide-react';

/**
 * Technology Page — Explains how Sphynx works internally.
 * Covers wallet authentication, vault architecture, encryption flow,
 * database architecture, and browser extension architecture.
 */
export default function TechnologyPage() {
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
              Works
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            A deep dive into the cryptographic architecture, authentication protocols, and engineering decisions that make Sphynx a zero-knowledge credential vault.
          </p>
        </div>

        {/* Wallet Authentication */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-[#D4AF37]/10 p-2.5 border border-[#D4AF37]/20 text-[#D4AF37]">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-bold">Wallet Authentication</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-bold text-white mb-3">Sign-In with Ethereum (SIWE)</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Sphynx uses the EIP-4361 standard for authentication. Instead of passwords or OAuth tokens, users prove their identity by signing a structured message with their Ethereum wallet.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The authentication flow works as follows:
              </p>
              <ol className="list-decimal list-inside text-sm text-slate-400 leading-relaxed space-y-2 ml-2">
                <li>The client requests a cryptographically random nonce from the server</li>
                <li>A structured EIP-4361 message is constructed containing the nonce, domain, and timestamp</li>
                <li>The user signs this message with their wallet (MetaMask, WalletConnect, etc.)</li>
                <li>The server verifies the signature, recovers the signer address, and issues a JWT</li>
              </ol>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">EIP-4361 Message Structure</h4>
              <pre className="text-xs text-slate-300 font-mono leading-relaxed bg-black/30 rounded-xl p-4 overflow-x-auto">
{`sphynx.app wants you to sign in
with your Ethereum account:
0x1234...abcd

Sign in to Sphynx Vault

URI: https://sphynx.app
Version: 1
Chain ID: 1
Nonce: aB3kF9mQ2x
Issued At: 2026-05-30T12:00:00Z
Expiration: 2026-05-30T12:01:30Z`}
              </pre>
              <p className="text-[10px] text-white/30 mt-3">
                Nonces are single-use and expire in 90 seconds, preventing replay attacks.
              </p>
            </Card>
          </div>
        </section>

        {/* Vault Architecture */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400">
              <Key size={20} />
            </div>
            <h2 className="text-2xl font-bold">Vault Architecture</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-bold text-white mb-3">Key Hierarchy (KEK / VEK)</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Sphynx uses a two-layer key hierarchy to protect your credentials:
              </p>
              <ul className="text-sm text-slate-400 leading-relaxed space-y-3 ml-2">
                <li>
                  <span className="font-semibold text-white">Key Encryption Key (KEK)</span> — Derived from a deterministic wallet signature using HKDF. This key wraps the VEK and never leaves your browser.
                </li>
                <li>
                  <span className="font-semibold text-white">Vault Encryption Key (VEK)</span> — A randomly generated AES-256-GCM key that encrypts and decrypts your actual credentials. The VEK is stored encrypted (wrapped by the KEK) on the server.
                </li>
              </ul>
              <p className="text-sm text-slate-400 leading-relaxed mt-4">
                This separation means the server only ever stores encrypted blobs. Even if the database is compromised, the attacker cannot decrypt anything without your wallet signature.
              </p>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Encryption Flow</h4>
              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">1</span>
                  <p>Wallet signs a deterministic message → produces a stable signature</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">2</span>
                  <p>Signature is fed into HKDF to derive the KEK (non-extractable CryptoKey)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">3</span>
                  <p>KEK unwraps the encrypted VEK stored on the server</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">4</span>
                  <p>VEK decrypts individual vault entries using AES-256-GCM</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-[10px]">5</span>
                  <p>All decryption happens in-browser — plaintext never touches the network</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Database Architecture */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20 text-amber-400">
              <Database size={20} />
            </div>
            <h2 className="text-2xl font-bold">Database Architecture</h2>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl">
            The backend uses PostgreSQL with Prisma ORM. The database stores only encrypted data and metadata — never plaintext credentials.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Users</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stores wallet addresses, encrypted VEK blobs, and session metadata. No emails or personal information required.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Vault Entries</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each entry contains an encrypted ciphertext blob, IV, label, and metadata. The server cannot distinguish between entries.
              </p>
            </Card>
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5">
              <h4 className="text-sm font-bold text-white mb-2">Guardian Circles</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recovery relationships, threshold configurations, and encrypted key shares for the social recovery system.
              </p>
            </Card>
          </div>
        </section>

        {/* Browser Extension Architecture */}
        <section className="mb-20 border-t border-white/5 pt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-fit rounded-xl bg-blue-500/10 p-2.5 border border-blue-500/20 text-blue-400">
              <Globe size={20} />
            </div>
            <h2 className="text-2xl font-bold">Browser Extension Architecture</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The Sphynx Chrome extension provides autofill capabilities while maintaining the zero-knowledge guarantee. It communicates with the web app through secure message passing.
              </p>
              <ul className="text-sm text-slate-400 leading-relaxed space-y-3 ml-2">
                <li>
                  <span className="font-semibold text-white">Background Service Worker</span> — Manages session state, handles message routing between content scripts and the popup.
                </li>
                <li>
                  <span className="font-semibold text-white">Content Script</span> — Detects login forms on web pages and injects autofill suggestions.
                </li>
                <li>
                  <span className="font-semibold text-white">Popup UI</span> — React-based interface for quick credential access and vault search.
                </li>
                <li>
                  <span className="font-semibold text-white">Session Sync</span> — The web app securely passes the derived key material to the extension via Chrome runtime messaging.
                </li>
              </ul>
            </div>

            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Extension Data Flow</h4>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <span className="text-[#D4AF37] font-semibold">Web App</span> → Session sync → <span className="text-emerald-400 font-semibold">Extension</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <span className="text-emerald-400 font-semibold">Extension</span> → Detects form → <span className="text-blue-400 font-semibold">Content Script</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <span className="text-blue-400 font-semibold">Content Script</span> → Decrypts locally → <span className="text-white font-semibold">Autofill</span>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-4">
                Credentials are decrypted in the extension's isolated context. The target website never receives the encryption key.
              </p>
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
