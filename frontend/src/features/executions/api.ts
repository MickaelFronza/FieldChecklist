import { apiClient } from '@/lib/apiClient';
import type { ChecklistExecution } from '@/types/api';

export interface ExecutionFilters {
  date?: string;
  vehicleId?: string;
  operatorId?: string;
  status?: string;
}

export async function fetchExecutions(filters: ExecutionFilters): Promise<ChecklistExecution[]> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)));
  const { data } = await apiClient.get<ChecklistExecution[]>('/executions', { params });
  return data;
}

export async function fetchExecutionDetail(id: string): Promise<ChecklistExecution> {
  const { data } = await apiClient.get<ChecklistExecution>(`/executions/${id}`);
  return data;
}
