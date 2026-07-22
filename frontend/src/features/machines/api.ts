import { apiClient } from '@/lib/apiClient';
import type { Machine } from '@/types/api';

export async function fetchMachines(): Promise<Machine[]> {
  const { data } = await apiClient.get<Machine[]>('/machines');
  return data;
}

export interface CreateMachineInput {
  code: string;
  name: string;
  type: string;
}

export async function createMachine(input: CreateMachineInput): Promise<Machine> {
  const { data } = await apiClient.post<Machine>('/machines', input);
  return data;
}

export interface UpdateMachineInput extends Partial<CreateMachineInput> {
  active?: boolean;
}

export async function updateMachine(id: string, input: UpdateMachineInput): Promise<Machine> {
  const { data } = await apiClient.put<Machine>(`/machines/${id}`, input);
  return data;
}
