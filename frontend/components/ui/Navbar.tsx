'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from './Button';

/**
 * Shared navigation bar for all public-facing marketing pages.
 * Preserves the Obsidian Sanctuary theme and existing design language.
 */
export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/technology', label: 'Technology' },
    { href: '/security', label: 'Security' },
    { href: '/why-sphynx', label: 'Why Sphynx' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="border-b border-white/5 bg-[#090D16]/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/">
            <Image
              src="/Logo-with-password.png"
              alt="Sphynx Logo"
              width={280}
              height={130}
              style={{ width: 'auto', height: '100px' }}
              className="object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.25)] transition-transform duration-300 hover:scale-105"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? 'text-[#D4AF37] bg-[#D4AF37]/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button
              variant="primary"
              className="px-5 py-2.5 text-xs font-bold"
            >
              Access Vault
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
