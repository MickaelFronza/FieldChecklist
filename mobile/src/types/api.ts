export type UserRole = 'admin' | 'manager' | 'operator';

export interface LoginOption {
  id: string;
  name: string;
  role: UserRole;
}

export interface Vehicle {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export interface TemplateItem {
  id: string;
  templateId: string;
  orderIndex: number;
  title: string;
  description: string | null;
  photoRequired: boolean;
  isBlocking: boolean;
  category: string | null;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  vehicleType: string | null;
  version: number;
  active: boolean;
  items: TemplateItem[];
}

export type Shift = 'manha' | 'tarde' | 'noite';
export type ExecutionStatus = 'in_progress' | 'completed' | 'incomplete';
export type ExecutionItemStatus = 'ok' | 'non_conformant' | 'not_applicable' | 'pending';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; role: UserRole };
}
