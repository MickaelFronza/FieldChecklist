import { apiClient } from '@/lib/apiClient';
import type { AppSettings, DeviceMonitorEntry } from '@/types/api';

export async function fetchDeviceMonitor(): Promise<DeviceMonitorEntry[]> {
  const { data } = await apiClient.get<DeviceMonitorEntry[]>('/admin/devices');
  return data;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data } = await apiClient.get<AppSettings>('/admin/settings');
  return data;
}

export async function updateAppSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const { data } = await apiClient.put<AppSettings>('/admin/settings', input);
  return data;
}
