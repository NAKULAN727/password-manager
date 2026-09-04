'use client';

import React from 'react';
import { DeleteSecretDialog } from './DeleteSecretDialog';
import { AutofillLockedModal } from './AutofillLockedModal';

/**
 * Global dialog host for Sphynx modals (replaces alert/confirm/prompt).
 * Mount once in the root layout.
 */
export function SphynxDialogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DeleteSecretDialog />
      <AutofillLockedModal />
    </>
  );
}
