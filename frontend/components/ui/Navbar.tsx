'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

/**
 * Navbar — The Vault theme.
 * Warm dark surface with amber accents, backdrop blur, gold logo.
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
    <header className="sticky top-0 z-50 bg-[#141009]/90 backdrop-blur-[12px] border-b border-[rgba(232,160,32,0.08)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="shrink-0">
            <Image
              src="/Logo-with-password.png"
              alt="Sphynx Logo"
              width={280}
              height={130}
              style={{ width: 'auto', height: '90px' }}
              className="object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-transform duration-200 hover:scale-105"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  pathname === link.href
                    ? 'text-[#F0E6D0]'
                    : 'text-[#9A7D5A] hover:text-[#F0E6D0]'
                }`}
              >
                {link.label}
                {/* Active indicator */}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#E8A020] rounded-full" />
                )}
                {/* Hover underline */}
                {pathname !== link.href && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#E8A020] rounded-full scale-x-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 origin-left" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <button className="px-5 py-2.5 text-xs font-bold text-[#0A0806] rounded-[10px] bg-gradient-to-br from-[#E8A020] to-[#B86A1A] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,160,32,0.3)] active:translate-y-0">
              Access Vault
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
