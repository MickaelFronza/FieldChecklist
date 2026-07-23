import { apiClient } from '@/lib/apiClient';
import type { DailyReport, OperatorReport, OperatorStatusReport } from '@/types/api';

export async function fetchDailyReport(date: string): Promise<DailyReport> {
  const { data } = await apiClient.get<DailyReport>('/reports/daily', { params: { date } });
  return data;
}

export async function fetchOperatorReport(operatorId: string): Promise<OperatorReport> {
  const { data } = await apiClient.get<OperatorReport>('/reports/operator', { params: { operatorId } });
  return data;
}

export async function fetchOperatorStatusToday(): Promise<OperatorStatusReport> {
  const { data } = await apiClient.get<OperatorStatusReport>('/reports/status-today');
  return data;
}
