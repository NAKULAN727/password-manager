import { create } from 'zustand';
import { api } from '../lib/api/client';

interface AuthState {
  address: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (address: string) => void;
  clearSession: () => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initializeSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize state to null to guarantee exact matching with Server-Rendered HTML
  address: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Queries the backend session endpoint to verify if secure cookies are active.
   * Restores user profile dynamically and securely post-mount without localStorage.
   */
  initializeSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await api.get('/auth/profile');
      if (data && data.user && data.user.address) {
        set({ 
          address: data.user.address.toLowerCase(), 
          isAuthenticated: true, 
          error: null 
        });
      } else {
        set({ address: null, isAuthenticated: false });
      }
    } catch (err: any) {
      // Session is not active or expired - keep clean signed-out state
      set({ address: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Establishes secure local session context. 
   * Cookies are automatically handled at the browser layer during verification.
   */
  setSession: (address: string) => {
    set({ 
      address: address.toLowerCase(), 
      isAuthenticated: true, 
      error: null 
    });
  },

  /**
   * Dispatches logout to invalidate cookies and clears in-memory context.
   */
  clearSession: async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.warn('Backend session termination failed:', err);
    } finally {
      set({ address: null, isAuthenticated: false, error: null });
    }
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
}));
