'use client';

import React from 'react';
import { ToastContainer } from './ToastContainer';

export function SphynxToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
