'use client';

import React, { useState, useEffect } from 'react';

interface HydrationSafeProps {
  children: React.ReactNode;
}

/**
 * High-fidelity wrapper that guards against SSR/CSR DOM mismatches.
 * Bypasses all hydration warnings caused by recursive browser extension injections
 * (e.g. bis_skin_checked, translate attributes, dark mode overrides).
 */
export function HydrationSafe({ children }: HydrationSafeProps) {
  const [mounted, setMounted] = useState(false);

  // Triggered strictly after hydration completes on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return an empty layout placeholder to match server rendering perfectly
    return null;
  }

  return <>{children}</>;
}
