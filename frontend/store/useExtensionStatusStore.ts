import { create } from 'zustand';
import { toast } from './useToastStore';

export type ExtensionStatus = 'connected' | 'locked' | 'unavailable';

interface ExtensionStatusState {
  status: ExtensionStatus;
  extensionDetected: boolean;
  setFromPing: (payload: { extensionId?: string; isUnlocked?: boolean } | null) => void;
  markUnavailable: () => void;
}

let lockedToastShown = false;

export const useExtensionStatusStore = create<ExtensionStatusState>((set, get) => ({
  status: 'unavailable',
  extensionDetected: false,

  setFromPing: (payload) => {
    if (!payload?.extensionId) {
      get().markUnavailable();
      return;
    }

    const next: ExtensionStatus = payload.isUnlocked ? 'connected' : 'locked';
    const prev = get().status;

    if (next === 'locked' && prev !== 'locked' && !lockedToastShown) {
      toast.info(
        'Extension Vault Locked',
        'Open the Sphynx extension to unlock autofill.',
        5000
      );
      lockedToastShown = true;
    }

    if (next === 'connected') {
      lockedToastShown = false;
    }

    set({ status: next, extensionDetected: true });
  },

  markUnavailable: () => {
    lockedToastShown = false;
    set({ status: 'unavailable', extensionDetected: false });
  },
}));
