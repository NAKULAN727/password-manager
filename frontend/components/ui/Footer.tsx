'use client';

import Link from 'next/link';

/**
 * Shared footer component for all public-facing marketing pages.
 * Preserves the Obsidian Sanctuary theme.
 */
export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#090D16] py-12 mt-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid gap-8 md:grid-cols-4 mb-10">
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Sphynx</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your digital sanctuary for credentials. Private, secure, and always under your control.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Product</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="/technology" className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors">Technology</Link></li>
              <li><Link href="/security" className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors">Security</Link></li>
              <li><Link href="/why-sphynx" className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors">Why Sphynx</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Resources</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="/contact" className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors">Contact</Link></li>
              <li><Link href="/login" className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors">Access Vault</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">Security</h4>
            <ul className="flex flex-col gap-2">
              <li className="text-xs text-slate-400">Zero-Knowledge Architecture</li>
              <li className="text-xs text-slate-400">Client-Side Encryption</li>
              <li className="text-xs text-slate-400">No Server Trust Required</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-white/30 tracking-wider font-mono">
            © {new Date().getFullYear()} Sphynx Security Labs. All cryptographic rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
