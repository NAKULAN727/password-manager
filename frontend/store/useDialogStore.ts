import { create } from 'zustand';

export interface DeleteSecretDialogData {
  serviceName: string;
  username: string;
}

type DialogType = 'delete-secret' | 'autofill-locked' | null;

interface DialogState {
  type: DialogType;
  deleteSecret: DeleteSecretDialogData | null;
  resolve: ((confirmed: boolean) => void) | null;
}

interface DialogActions {
  /** Opens the delete-secret modal; resolves true if user confirms deletion. */
  confirmDeleteSecret: (data: DeleteSecretDialogData) => Promise<boolean>;
  /** Opens when autofill is attempted while the extension vault is locked. */
  openAutofillLockedModal: () => void;
  closeDialog: (confirmed: boolean) => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set, get) => ({
  type: null,
  deleteSecret: null,
  resolve: null,

  confirmDeleteSecret: (data) =>
    new Promise<boolean>((resolve) => {
      set({
        type: 'delete-secret',
        deleteSecret: data,
        resolve,
      });
    }),

  openAutofillLockedModal: () => {
    set({
      type: 'autofill-locked',
      deleteSecret: null,
      resolve: null,
    });
  },

  closeDialog: (confirmed) => {
    const { resolve } = get();
    resolve?.(confirmed);
    set({
      type: null,
      deleteSecret: null,
      resolve: null,
    });
  },
}));
