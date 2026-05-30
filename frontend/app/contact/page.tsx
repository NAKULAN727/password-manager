'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageLayout } from '../../components/ui/PageLayout';
import { ArrowLeft, Send, Mail, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// --- Validation helpers ---

function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'This field is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 100) return 'Name must be under 100 characters';
  if (!/^[a-zA-Z\s\-]+$/.test(trimmed)) return 'Name can only contain letters, spaces, and hyphens';
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 'This field is required';
  if (trimmed.length > 254) return 'Email must be under 254 characters';
  // No consecutive dots
  if (/\.\./.test(trimmed)) return 'Please enter a valid email address';
  // Basic structure check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
  // TLD must be at least 2 chars
  const tld = trimmed.split('.').pop();
  if (!tld || tld.length < 2) return 'Please enter a valid email address';
  return undefined;
}

function validateSubject(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'This field is required';
  if (trimmed.length < 5) return 'Subject must be at least 5 characters';
  if (trimmed.length > 150) return 'Subject must be under 150 characters';
  return undefined;
}

function validateMessage(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'This field is required';
  if (trimmed.length < 10) return 'Message must be at least 10 characters';
  if (trimmed.length > 1000) return 'Message must be under 1000 characters';
  return undefined;
}

/**
 * Contact Page — Premium contact form with validate-on-blur behavior,
 * warm micro-copy, and live character counter.
 */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Field-level validation
  const validateField = useCallback((field: keyof typeof formData, value: string): string | undefined => {
    switch (field) {
      case 'name': return validateName(value);
      case 'email': return validateEmail(value);
      case 'subject': return validateSubject(value);
      case 'message': return validateMessage(value);
    }
  }, []);

  // Validate all fields, returns true if valid
  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      subject: validateSubject(formData.subject),
      message: validateMessage(formData.message),
    };
    setErrors(newErrors);
    // Mark all as touched
    setTouched({ name: true, email: true, subject: true, message: true });
    return !newErrors.name && !newErrors.email && !newErrors.subject && !newErrors.message;
  };

  // Handle blur — validate the field
  const handleBlur = (field: keyof typeof formData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Handle change
  const handleChange = (field: keyof typeof formData, value: string) => {
    // Enforce max length for message
    if (field === 'message' && value.length > 1000) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // If already touched, revalidate on change for immediate feedback
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    setSubmitMessage('');

    if (!validateAll()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Message sent successfully. I\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setErrors({});
        setTouched({});
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitStatus('error');
      setSubmitMessage('Unable to reach the server. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = !!(errors.name || errors.email || errors.subject || errors.message);

  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-24 animate-fade-in">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37] hover:text-white transition-colors mb-12">
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        {/* Page Header */}
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Get In{' '}
            <span className="bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed">
            Questions, feedback, feature suggestions, or security concerns? I'd love to hear from you.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Contact Form */}
          <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-2">
                  Full Name <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="What should we call you?"
                  maxLength={100}
                  className={`w-full rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all duration-200 glow-input ${
                    touched.name && errors.name ? 'border-[#E05C4B]/50' : 'border-white/10 focus:border-[#D4AF37]/30'
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="mt-1.5 text-[11px] text-[#E05C4B]">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-2">
                  Email Address <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="your@email.com"
                  maxLength={254}
                  className={`w-full rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all duration-200 glow-input ${
                    touched.email && errors.email ? 'border-[#E05C4B]/50' : 'border-white/10 focus:border-[#D4AF37]/30'
                  }`}
                />
                {touched.email && errors.email && (
                  <p className="mt-1.5 text-[11px] text-[#E05C4B]">{errors.email}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="contact-subject" className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-2">
                  Subject <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  onBlur={() => handleBlur('subject')}
                  placeholder="What's on your mind?"
                  maxLength={150}
                  className={`w-full rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all duration-200 glow-input ${
                    touched.subject && errors.subject ? 'border-[#E05C4B]/50' : 'border-white/10 focus:border-[#D4AF37]/30'
                  }`}
                />
                {touched.subject && errors.subject && (
                  <p className="mt-1.5 text-[11px] text-[#E05C4B]">{errors.subject}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="contact-message" className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-2">
                  Message <span className="text-[#D4AF37]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  onBlur={() => handleBlur('message')}
                  placeholder="Tell us more — we're listening"
                  rows={6}
                  className={`w-full rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all duration-200 resize-none glow-input ${
                    touched.message && errors.message ? 'border-[#E05C4B]/50' : 'border-white/10 focus:border-[#D4AF37]/30'
                  }`}
                />
                <div className="flex items-center justify-between mt-1.5">
                  {touched.message && errors.message ? (
                    <p className="text-[11px] text-[#E05C4B]">{errors.message}</p>
                  ) : (
                    <span />
                  )}
                  <span className={`text-[10px] font-mono ${formData.message.length > 900 ? 'text-amber-400' : formData.message.length >= 1000 ? 'text-[#E05C4B]' : 'text-white/20'}`}>
                    {formData.message.length}/1000
                  </span>
                </div>
              </div>

              {/* Submit Status */}
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3"
                >
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">{submitMessage}</p>
                </motion.div>
              )}

              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[#E05C4B]/20 bg-[#E05C4B]/5 p-4 flex items-center gap-3"
                >
                  <AlertTriangle size={16} className="text-[#E05C4B] shrink-0" />
                  <p className="text-xs text-[#E05C4B]">{submitMessage}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full gap-2 py-3.5 text-sm font-bold"
              >
                <Send size={15} />
                Send Message
              </Button>
            </form>
          </Card>

          {/* Sidebar: Contact Info */}
          <div className="flex flex-col gap-6">
            {/* Contact Information Card */}
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-5">
                Contact Information
              </h3>

              <div className="space-y-4">
                <a
                  href="mailto:nakulan07022007@gmail.com"
                  className="flex items-center gap-3 text-sm text-slate-300 hover:text-[#D4AF37] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                    <Mail size={14} className="text-[#D4AF37]" />
                  </div>
                  <span className="text-xs font-mono">nakulan07022007@gmail.com</span>
                </a>

                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/70">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <span className="text-xs">GitHub</span>
                </a>

                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-slate-300 hover:text-blue-400 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/5 border border-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400/70">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <span className="text-xs">LinkedIn</span>
                </a>
              </div>
            </Card>

            {/* What to reach out about */}
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
                Reach Out About
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
                  General questions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
                  Feature suggestions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
                  Bug reports
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
                  Feedback &amp; ideas
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-red-400" />
                  Security vulnerabilities
                </li>
              </ul>
            </Card>

            {/* Security Notice */}
            <div className="rounded-2xl border border-[#D4AF37]/10 bg-amber-950/5 p-4 text-xs leading-relaxed text-slate-400">
              <div className="font-bold flex items-center gap-1.5 mb-1.5 text-[#D4AF37]">
                <Shield size={12} className="shrink-0" />
                Security Reports
              </div>
              If you've found a security vulnerability, please include detailed reproduction steps. All reports are treated with urgency and confidentiality.
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4 pt-8 mt-16 border-t border-white/5">
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
