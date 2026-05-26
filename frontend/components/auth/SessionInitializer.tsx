'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Client-only component that handles post-hydration session recovery
 * exactly once without blocking server-side rendering or triggering HTML mismatches.
 */
export function SessionInitializer() {
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return null;
}
