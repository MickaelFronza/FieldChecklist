export type UserRole = 'admin' | 'manager' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string | null;
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

export type VehicleCategory = 'carro' | 'onibus' | 'navio' | 'caminhao' | 'trator' | 'moto' | 'outro';

export interface Vehicle {
  id: string;
  code: string;
  name: string;
  type: string;
  category: VehicleCategory;
  plate: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  operators?: Pick<User, 'id' | 'name'>[];
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
  createdBy: string | null;
  createdAt?: string;
  updatedAt?: string;
  items?: TemplateItem[];
}

export type Shift = 'manha' | 'tarde' | 'noite';
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
  photoReused: boolean;
  photoUrl?: string | null;
  markedAt: string | null;
  syncedAt: string | null;
  templateItem?: TemplateItem;
}

export interface ChecklistExecution {
  id: string;
  templateId: string;
  vehicleId: string;
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
  odometerKm: number | null;
  fuelLevel: 'vazio' | 'quarto' | 'metade' | 'tres_quartos' | 'cheio' | null;
  vehicle?: Vehicle;
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

export type OperatorTodayStatus = 'not_started' | 'in_progress' | 'completed';

export interface OperatorStatusToday {
  operatorId: string;
  name: string;
  status: OperatorTodayStatus;
  vehicleName: string | null;
  lastStartedAt: string | null;
}

export interface OperatorStatusReport {
  date: string;
  totalOperators: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  operators: OperatorStatusToday[];
}

export interface DeviceMonitorEntry {
  id: string;
  deviceId: string;
  active: boolean;
  lastSeenAt: string;
  user: Pick<User, 'id' | 'name' | 'role'>;
  lastLocation: { lat: string; lng: string; at: string } | null;
}

export interface AppSettings {
  maxTotalDevices: number | null;
  morningStartHour: number;
  afternoonStartHour: number;
  nightStartHour: number;
}
