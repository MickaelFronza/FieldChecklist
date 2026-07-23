export type UserRole = 'admin' | 'manager' | 'operator';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  maxDevices: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string | null;
  active: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface LoginOption {
  id: string;
  name: string;
  role: UserRole;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  machineType: string | null;
  version: number;
  active: boolean;
  createdBy: string | null;
  createdAt?: string;
  updatedAt?: string;
  items?: TemplateItem[];
}

export type Shift = 'morning' | 'afternoon' | 'night';
export type ExecutionStatus = 'in_progress' | 'completed' | 'incomplete';
export type ExecutionItemStatus = 'ok' | 'non_conformant' | 'not_applicable' | 'pending';

export interface ExecutionItem {
  id: string;
  executionId: string;
  templateItemId: string;
  status: ExecutionItemStatus;
  justification: string | null;
  photoKey: string | null;
  photoHash: string | null;
  photoUrl?: string | null;
  markedAt: string | null;
  syncedAt: string | null;
  templateItem?: TemplateItem;
}

export interface ChecklistExecution {
  id: string;
  templateId: string;
  machineId: string;
  operatorId: string;
  shift: Shift;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  syncedAt: string | null;
  deviceId: string;
  appVersion: string;
  startedLat: string | null;
  startedLng: string | null;
  machine?: Machine;
  operator?: Pick<User, 'id' | 'name'>;
  items?: ExecutionItem[];
}

export interface DailyReport {
  date: string;
  totalExecutions: number;
  completedExecutions: number;
  incompleteExecutions: number;
  nonConformantItems: number;
  executions: ChecklistExecution[];
}

export interface OperatorReport {
  operator: Pick<User, 'id' | 'name' | 'role'>;
  executions: ChecklistExecution[];
}
