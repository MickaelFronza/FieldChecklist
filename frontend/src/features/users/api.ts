import { apiClient } from '@/lib/apiClient';
import type { User, UserDevice, UserRole } from '@/types/api';

export type CreatableRole = Exclude<UserRole, 'admin'>;

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users');
  return data;
}

export interface CreateUserInput {
  name: string;
  role: CreatableRole;
  pin?: string;
  email?: string;
  password?: string;
  maxDevices?: number;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<User>('/users', input);
  return data;
}

export interface UpdateUserInput {
  name?: string;
  active?: boolean;
  maxDevices?: number;
  pin?: string;
  email?: string;
  password?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.put<User>(`/users/${id}`, input);
  return data;
}

export async function fetchUserDevices(userId: string): Promise<UserDevice[]> {
  const { data } = await apiClient.get<UserDevice[]>(`/users/${userId}/devices`);
  return data;
}

export async function updateUserDevice(userId: string, deviceId: string, active: boolean): Promise<UserDevice> {
  const { data } = await apiClient.put<UserDevice>(`/users/${userId}/devices/${deviceId}`, { active });
  return data;
}
