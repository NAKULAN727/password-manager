'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useDialogStore } from '../../store/useDialogStore';

const GOLD = '#f5b942';

export function AutofillLockedModal() {
  const { type, closeDialog } = useDialogStore();
  const isOpen = type === 'autofill-locked';

  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleCancel = useCallback(() => closeDialog(false), [closeDialog]);

  const handleOpenExtension = useCallback(() => {
    closeDialog(false);
    window.postMessage({ type: 'SPHYNX_OPEN_EXTENSION' }, '*');
  }, [closeDialog]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOpenExtension();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length < 2) return;
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
  }, [isOpen, handleCancel, handleOpenExtension]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="presentation">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-[#06090f]/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
          />

          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="autofill-locked-title"
            aria-describedby="autofill-locked-desc"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#f5b942]/20 bg-[#0c1018]/90 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f5b942]/25 bg-[#f5b942]/10"
                  style={{ boxShadow: '0 0 20px rgba(245, 185, 66, 0.12)' }}
                >
                  <Lock size={20} style={{ color: GOLD }} strokeWidth={1.75} />
                </div>
                <div>
                  <h2 id="autofill-locked-title" className="text-lg font-semibold text-white">
                    Extension vault is locked
                  </h2>
                  <p id="autofill-locked-desc" className="mt-2 text-sm leading-relaxed text-slate-400">
                    Unlock the extension to continue.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Cancel
                </button>
                <button
                  ref={openRef}
                  type="button"
                  onClick={handleOpenExtension}
                  className="inline-flex items-center justify-center rounded-xl border border-[#f5b942]/40 bg-[#f5b942]/15 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[#f5b942]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b942]/50"
                  style={{ color: GOLD }}
                >
                  Open Extension
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
