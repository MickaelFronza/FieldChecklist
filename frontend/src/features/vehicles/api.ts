import { apiClient } from '@/lib/apiClient';
import type { Vehicle } from '@/types/api';

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>('/vehicles');
  return data;
}

export interface CreateVehicleInput {
  code: string;
  name: string;
  type: string;
}

export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>('/vehicles', input);
  return data;
}

export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  active?: boolean;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
  const { data } = await apiClient.put<Vehicle>(`/vehicles/${id}`, input);
  return data;
}

export async function updateVehicleOperators(vehicleId: string, operatorIds: string[]): Promise<Vehicle> {
  const { data } = await apiClient.put<Vehicle>(`/vehicles/${vehicleId}/operators`, { operatorIds });
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}
