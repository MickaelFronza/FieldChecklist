import axios from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { LoginOption, User } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function fetchLoginOptions(): Promise<LoginOption[]> {
  const { data } = await apiClient.get<LoginOption[]>('/auth/login-options');
  return data;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function login(nameId: string, pin: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { nameId, pin });
  return data;
}

export async function refreshWithToken(refreshToken: string): Promise<{ accessToken: string }> {
  const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, { refreshToken });
  return data;
}
