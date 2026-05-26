import { create } from 'zustand';

interface AuthState {
  address: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (address: string, token: string) => void;
  clearSession: () => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initializeSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize state to null to guarantee exact matching with Server-Rendered HTML
  address: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Loads local storage keys safely strictly after client hydration has completed
  initializeSession: () => {
    if (typeof window !== 'undefined') {
      const address = localStorage.getItem('zk_wallet_address');
      const token = localStorage.getItem('zk_auth_token');
      if (address && token) {
        set({ address: address.toLowerCase(), token, isAuthenticated: true, error: null });
      }
    }
  },

  setSession: (address: string, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zk_wallet_address', address.toLowerCase());
      localStorage.setItem('zk_auth_token', token);
    }
    set({ address: address.toLowerCase(), token, isAuthenticated: true, error: null });
  },

  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zk_wallet_address');
      localStorage.removeItem('zk_auth_token');
    }
    set({ address: null, token: null, isAuthenticated: false, error: null });
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
}));
