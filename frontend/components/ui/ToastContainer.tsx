'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type Toast } from '../../store/useToastStore';

const GOLD = '#f5b942';
const DISMISS_MS = 4000;

const TYPE_STYLES: Record<
  Toast['type'],
  { accent: string; border: string; glow: string }
> = {
  success: {
    accent: 'text-emerald-400',
    border: 'border-emerald-500/25',
    glow: '0 0 24px rgba(16, 185, 129, 0.12)',
  },
  error: {
    accent: 'text-red-400',
    border: 'border-red-500/25',
    glow: '0 0 24px rgba(239, 68, 68, 0.12)',
  },
  info: {
    accent: 'text-[#f5b942]',
    border: 'border-[#f5b942]/30',
    glow: '0 0 28px rgba(245, 185, 66, 0.15)',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const dismissMs = toast.durationMs ?? DISMISS_MS;
  const remainingMs = useRef(dismissMs);
  const startedAt = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = TYPE_STYLES[toast.type];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleDismiss = useCallback(
    (ms: number) => {
      clearTimer();
      remainingMs.current = ms;
      startedAt.current = Date.now();
      timerRef.current = setTimeout(() => onDismiss(toast.id), ms);
    },
    [clearTimer, onDismiss, toast.id]
  );

  useEffect(() => {
    remainingMs.current = dismissMs;
    scheduleDismiss(dismissMs);
    return clearTimer;
  }, [scheduleDismiss, clearTimer, dismissMs]);

  const handleMouseEnter = () => {
    const elapsed = Date.now() - startedAt.current;
    remainingMs.current = Math.max(0, remainingMs.current - elapsed);
    clearTimer();
  };

  const handleMouseLeave = () => {
    scheduleDismiss(remainingMs.current);
  };

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, x: 48, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border bg-[#0c1018]/92 backdrop-blur-xl ${style.border}`}
      style={{
        boxShadow: `${style.glow}, 0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 185, 66, 0.06)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        }}
      />
      <div className="px-4 py-3.5">
        <p className={`text-sm font-semibold tracking-tight ${style.accent}`}>{toast.title}</p>
        {toast.message && (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{toast.message}</p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Fixed top-right toast stack. Does not cover center vault content.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[400] flex max-h-[calc(100dvh-2rem)] flex-col items-end gap-2.5 overflow-hidden"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
