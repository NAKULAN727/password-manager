import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (title: string, message?: string, durationMs?: number) =>
    useToastStore.getState().push({ type: 'success', title, message, durationMs }),

  error: (title: string, message?: string, durationMs?: number) =>
    useToastStore.getState().push({ type: 'error', title, message, durationMs }),

  info: (title: string, message?: string, durationMs?: number) =>
    useToastStore.getState().push({ type: 'info', title, message, durationMs }),

  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
