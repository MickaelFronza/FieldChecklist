import { apiClient } from '@/lib/apiClient';
import type { DeviceMonitorEntry } from '@/types/api';

export async function fetchDeviceMonitor(): Promise<DeviceMonitorEntry[]> {
  const { data } = await apiClient.get<DeviceMonitorEntry[]>('/admin/devices');
  return data;
}
