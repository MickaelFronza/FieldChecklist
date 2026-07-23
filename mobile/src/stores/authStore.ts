import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { UserRole } from '../types/api';

const SESSION_KEY = 'field_checklist_session';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: { user: SessionUser; accessToken: string; refreshToken: string }) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  setSession: ({ user, accessToken, refreshToken }) => {
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ user, refreshToken })).catch(() => {});
    set({ user, accessToken, refreshToken });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => {
    SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

export async function loadPersistedSession(): Promise<{ user: SessionUser; refreshToken: string } | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
