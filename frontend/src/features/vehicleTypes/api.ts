import { apiClient } from '@/lib/apiClient';

export interface VehicleType {
  id: string;
  name: string;
}

export async function fetchVehicleTypes(): Promise<VehicleType[]> {
  const { data } = await apiClient.get<VehicleType[]>('/vehicle-types');
  return data;
}

export async function createVehicleType(name: string): Promise<VehicleType> {
  const { data } = await apiClient.post<VehicleType>('/vehicle-types', { name });
  return data;
}

export async function deleteVehicleType(id: string): Promise<void> {
  await apiClient.delete(`/vehicle-types/${id}`);
}
