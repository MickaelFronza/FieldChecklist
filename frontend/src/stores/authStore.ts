import { create } from 'zustand';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

const REFRESH_TOKEN_STORAGE_KEY = 'field_checklist_refresh_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),

  setSession: ({ user, accessToken, refreshToken }) => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    set({ user, accessToken, refreshToken });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
