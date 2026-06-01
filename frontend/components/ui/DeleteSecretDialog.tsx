'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useDialogStore } from '../../store/useDialogStore';

const GOLD = '#f5b942';

/**
 * Destructive confirmation modal for vault entry deletion.
 * Replaces native window.confirm().
 */
export function DeleteSecretDialog() {
  const { type, deleteSecret, closeDialog } = useDialogStore();
  const isOpen = type === 'delete-secret' && !!deleteSecret;

  const panelRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  const handleKeep = useCallback(() => closeDialog(false), [closeDialog]);
  const handleDelete = useCallback(() => closeDialog(true), [closeDialog]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    keepRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleKeep();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleDelete();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleKeep, handleDelete]);

  return (
    <AnimatePresence>
      {isOpen && deleteSecret && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 cursor-default bg-[#06090f]/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleKeep}
          />

          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-secret-title"
            aria-describedby="delete-secret-desc"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#f5b942]/20 bg-[#0c1018]/90 shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(245,185,66,0.08)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                opacity: 0.45,
              }}
            />

            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#f5b942]/25 bg-[#f5b942]/8"
                  style={{ boxShadow: '0 0 24px rgba(245, 185, 66, 0.12)' }}
                >
                  <ShieldAlert size={22} style={{ color: GOLD }} strokeWidth={1.75} />
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    aria-hidden
                  >
                    !
                  </span>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <h2
                    id="delete-secret-title"
                    className="text-lg font-semibold tracking-tight text-white"
                  >
                    Security Warning
                  </h2>
                  <p
                    id="delete-secret-desc"
                    className="mt-3 text-sm leading-relaxed text-slate-400"
                  >
                    You are about to permanently delete this secret.
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Service
                  </dt>
                  <dd className="font-medium text-white">{deleteSecret.serviceName}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Username
                  </dt>
                  <dd className="font-mono text-sm text-slate-300">
                    {deleteSecret.username || '—'}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs font-medium text-red-400/90">
                This action cannot be reversed.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  ref={keepRef}
                  type="button"
                  onClick={handleKeep}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1018]"
                >
                  Keep Secret
                </button>
                <button
                  ref={deleteRef}
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1018]"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
