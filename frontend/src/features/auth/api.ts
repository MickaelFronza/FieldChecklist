import axios from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { User } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login-password', { email, password });
  return data;
}

export async function refreshWithToken(refreshToken: string): Promise<{ accessToken: string }> {
  const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, { refreshToken });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}
