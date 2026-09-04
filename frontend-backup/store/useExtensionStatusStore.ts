import { create } from 'zustand';
import { toast } from './useToastStore';

export type ExtensionStatus = 'connected' | 'unavailable' | 'locked';

interface ExtensionStatusState {
  status: ExtensionStatus;
  extensionDetected: boolean;
  extensionLocked: boolean;
  setFromPing: (payload: { extensionId?: string; isUnlocked?: boolean } | null) => void;
  markUnavailable: () => void;
}

let lockedToastShown = false;

export const useExtensionStatusStore = create<ExtensionStatusState>((set, get) => ({
  status: 'unavailable',
  extensionDetected: false,
  extensionLocked: true,

  setFromPing: (payload) => {
    if (!payload?.extensionId) {
      get().markUnavailable();
      return;
    }

    if (typeof payload.isUnlocked !== 'boolean') {
      set({ extensionDetected: true });
      return;
    }

    const extensionLocked = !payload.isUnlocked;
    const next: ExtensionStatus = payload.isUnlocked ? 'connected' : 'locked';
    const prev = get().status;

    console.log('[Extension Status] website state:', extensionLocked);
    console.log('[Extension Status] sync payload:', payload);

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

    set({
      status: next,
      extensionDetected: true,
      extensionLocked,
    });
  },

  markUnavailable: () => {
    lockedToastShown = false;
    set({
      status: 'unavailable',
      extensionDetected: false,
      extensionLocked: true,
    });
  },
}));
