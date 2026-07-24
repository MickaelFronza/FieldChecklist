import { apiClient } from '@/lib/apiClient';
import type { ChecklistTemplate } from '@/types/api';

export interface TemplateItemInput {
  title: string;
  description?: string;
  photoRequired: boolean;
  isBlocking: boolean;
  category?: string;
}

export async function fetchTemplates(): Promise<ChecklistTemplate[]> {
  const { data } = await apiClient.get<ChecklistTemplate[]>('/templates');
  return data;
}

export interface CreateTemplateInput {
  name: string;
  vehicleType?: string;
  items: TemplateItemInput[];
}

export async function createTemplate(input: CreateTemplateInput): Promise<ChecklistTemplate> {
  const { data } = await apiClient.post<ChecklistTemplate>('/templates', input);
  return data;
}

export interface UpdateTemplateInput {
  name?: string;
  active?: boolean;
  items?: TemplateItemInput[];
}

export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<ChecklistTemplate> {
  const { data } = await apiClient.put<ChecklistTemplate>(`/templates/${id}`, input);
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/templates/${id}`);
}
