'use client';

import React from 'react';
import { useExtensionStatusStore, type ExtensionStatus } from '../../store/useExtensionStatusStore';

const BADGE: Record<
  ExtensionStatus,
  { label: string; dot: string; border: string; bg: string; text: string }
> = {
  connected: {
    label: 'Extension Connected',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
  },
  locked: {
    label: 'Extension Locked',
    dot: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/8',
    text: 'text-orange-400',
  },
  unavailable: {
    label: 'Extension Unavailable',
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]',
    border: 'border-red-500/25',
    bg: 'bg-red-500/8',
    text: 'text-red-400',
  },
};

export function ExtensionStatusBadge() {
  const status = useExtensionStatusStore((s) => s.status);
  const style = BADGE[status];

  return (
    <div
      className={`hidden sm:flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono select-none ${style.border} ${style.bg} ${style.text}`}
      title={style.label}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </div>
  );
}
