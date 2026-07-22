import { apiClient } from '@/lib/apiClient';
import type { User, UserRole } from '@/types/api';

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users');
  return data;
}

export interface CreateUserInput {
  name: string;
  pin: string;
  role: UserRole;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<User>('/users', input);
  return data;
}

export interface UpdateUserInput {
  name?: string;
  pin?: string;
  role?: UserRole;
  active?: boolean;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.put<User>(`/users/${id}`, input);
  return data;
}
