'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PageLayout } from '../components/ui/PageLayout';
import { Shield, Lock, Users, Fingerprint, ChevronRight, ArrowRight } from 'lucide-react';

/**
 * Sphynx Homepage — "The Vault" theme.
 * Warm, premium, trustworthy. Physical vault with warm interior amber light.
 * Scroll-triggered animations, counting stats, shimmer headline.
 */
export default function HomePage() {
  return (
    <PageLayout>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <WhySection />
      <CTASection />
    </PageLayout>
  );
}

// --- Hero Section ---
function HeroSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-36">
      <div className="flex flex-col items-center text-center">
        {/* Headline with staggered fade-up */}
        <h1
          className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl leading-tight sm:leading-none font-[family-name:var(--font-sora)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <span className="text-[#F0E6D0]">Your Digital</span>{' '}
          <span className="relative bg-gradient-to-r from-[#E8A020] to-[#FF9A3C] bg-clip-text text-transparent">
            Sanctuary
            {/* One-shot shimmer sweep */}
            <span className="absolute inset-0 shimmer-text rounded pointer-events-none" />
          </span>
        </h1>

        {/* Subtext */}
        <p
          className="mt-8 max-w-[560px] text-lg text-[#9A7D5A] leading-relaxed transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] delay-[80ms]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Your passwords, locked away where only you can reach them. No master passwords, no third parties, no compromises.
        </p>

        {/* Buttons */}
        <div
          className="mt-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] delay-[160ms]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <Link href="/login">
            <button className="group flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-[#0A0806] rounded-[10px] bg-gradient-to-br from-[#E8A020] to-[#B86A1A] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,160,32,0.3)] active:translate-y-0">
              Access Vault
              <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </Link>

          <Link href="/technology">
            <button className="px-7 py-3.5 text-sm font-medium text-[#9A7D5A] rounded-[10px] border border-[#2A1E10] bg-transparent transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#E8A020] hover:text-[#F0E6D0]">
              Learn More
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Problem Section with animated counters ---
function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 sm:px-8 section-divider pt-20">
      <FadeUp visible={inView}>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#F0E6D0] font-[family-name:var(--font-sora)]">
            Passwords Are Broken
          </h2>
          <p className="mt-6 text-[#9A7D5A] text-lg leading-relaxed">
            You juggle dozens — maybe hundreds — of accounts. Passwords get reused, forgotten, and leaked. It shouldn't be this hard to stay safe online.
          </p>
        </div>
      </FadeUp>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        <StatCard value={80} suffix="%" label="of breaches involve weak or reused passwords" inView={inView} delay={0} />
        <StatCard value={100} suffix="+" label="average accounts per person" inView={inView} delay={80} />
        <StatCard value={0} suffix="" label="passwords you need to remember with Sphynx" inView={inView} delay={160} />
      </div>
    </section>
  );
}

// --- Solution Section ---
function SolutionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    { title: 'Encrypted Storage', desc: 'Every secret is locked with military-grade encryption before it ever leaves your device.' },
    { title: 'Wallet Sign-In', desc: 'Your crypto wallet is your key. No emails, no master passwords, no weak links.' },
    { title: 'Browser Autofill', desc: 'Credentials flow seamlessly into login forms — fast, private, and hands-free.' },
    { title: 'Guardian Recovery', desc: 'Trusted people can help you get back in. No single point of failure, ever.' },
    { title: 'You Own Everything', desc: "The server stores ciphertext. Only your wallet can unlock what's inside." },
    { title: 'Works Everywhere', desc: 'Access your vault from any device, any browser, any time — just connect your wallet.' },
  ];

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 sm:px-8 mt-32">
      <FadeUp visible={inView}>
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#F0E6D0] font-[family-name:var(--font-sora)]">
            One Vault. Complete Control.
          </h2>
          <p className="mt-4 text-[#9A7D5A] max-w-xl mx-auto text-lg">
            A single, secure home for all your credentials — without trusting anyone else with your data.
          </p>
        </div>
      </FadeUp>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {features.map((item, i) => (
          <FadeUp key={item.title} visible={inView} delay={i * 80}>
            <div className="rounded-2xl border border-[#2A1E10] bg-[#141009] p-6 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[rgba(232,160,32,0.3)] hover:shadow-[0_0_30px_rgba(232,160,32,0.08),0_4px_20px_rgba(0,0,0,0.4)]">
              <h3 className="text-sm font-bold text-[#F0E6D0] mb-2 font-[family-name:var(--font-sora)]">{item.title}</h3>
              <p className="text-xs text-[#9A7D5A] leading-relaxed">{item.desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// --- Why Section with feature cards ---
function WhySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      icon: <Lock size={22} />,
      title: 'Private by Design',
      desc: 'Encrypted on your device before anything is stored. The server is blind to your secrets.',
    },
    {
      icon: <Shield size={22} />,
      title: 'Wallet-Based Access',
      desc: 'No master password to forget or get phished. Your wallet signature is your proof of identity.',
    },
    {
      icon: <Users size={22} />,
      title: 'Guardian Recovery',
      desc: 'Trusted people form your safety net. Multiple approvals required — no single guardian can act alone.',
    },
    {
      icon: <Fingerprint size={22} />,
      title: 'Browser Autofill',
      desc: 'The Sphynx extension fills credentials instantly. Secure, seamless, and always under your control.',
    },
  ];

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 sm:px-8 mt-32 section-divider pt-20">
      <FadeUp visible={inView}>
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#F0E6D0] font-[family-name:var(--font-sora)]">
            Why People Trust Sphynx
          </h2>
        </div>
      </FadeUp>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <FadeUp key={card.title} visible={inView} delay={i * 80}>
            <div className="flex flex-col gap-4 rounded-2xl border border-[#2A1E10] bg-[#141009] p-6 shadow-[0_0_30px_rgba(232,160,32,0.05),0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[rgba(232,160,32,0.3)] hover:shadow-[0_0_40px_rgba(232,160,32,0.1),0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="w-fit rounded-xl bg-[rgba(232,160,32,0.08)] p-3 text-[#E8A020]">
                {card.icon}
              </div>
              <h3 className="text-base font-bold text-[#F0E6D0] font-[family-name:var(--font-sora)]">{card.title}</h3>
              <p className="text-xs leading-relaxed text-[#9A7D5A]">{card.desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// --- Final CTA Section ---
function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 sm:px-8 mt-32 mb-12">
      <FadeUp visible={inView}>
        <div className="rounded-3xl border border-[#2A1E10] bg-[#141009] p-12 sm:p-16 text-center shadow-[0_0_60px_rgba(232,160,32,0.04)]">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[#F0E6D0] mb-4 font-[family-name:var(--font-sora)]">
            Ready to Lock Things Down?
          </h2>
          <p className="text-[#9A7D5A] max-w-lg mx-auto mb-8 text-base leading-relaxed">
            Step inside the vault. Full ownership of your credentials, zero trust required.
          </p>
          <Link href="/login">
            <button className="group inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-[#0A0806] rounded-[10px] bg-gradient-to-br from-[#E8A020] to-[#B86A1A] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,160,32,0.3)] active:translate-y-0">
              Access Vault
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </FadeUp>
    </section>
  );
}

// --- Utility Components ---

/** Fade-up wrapper triggered by visibility */
function FadeUp({ children, visible, delay = 0 }: { children: React.ReactNode; visible: boolean; delay?: number }) {
  return (
    <div
      className="transition-all ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transitionDuration: '400ms',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Animated stat counter card */
function StatCard({ value, suffix, label, inView, delay }: {
  value: number;
  suffix: string;
  label: string;
  inView: boolean;
  delay: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (value === 0) { setCount(0); return; }

    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
    }, delay);

    return () => clearTimeout(timer);
  }, [inView, value, delay]);

  return (
    <FadeUp visible={inView} delay={delay}>
      <div className="rounded-2xl border border-[#2A1E10] border-t-2 border-t-[#E8A020] bg-[#141009] p-6 text-center shadow-[0_0_30px_rgba(232,160,32,0.05),0_4px_20px_rgba(0,0,0,0.4)]">
        <p className="text-3xl font-bold font-[family-name:var(--font-sora)] bg-gradient-to-r from-[#E8A020] to-[#FF9A3C] bg-clip-text text-transparent">
          {count}{suffix}
        </p>
        <p className="mt-2 text-xs text-[#9A7D5A] leading-relaxed">{label}</p>
      </div>
    </FadeUp>
  );
}
