import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ChecklistTemplate } from './ChecklistTemplate';
import type { Vehicle } from './Vehicle';
import type { User } from './User';
import type { ExecutionItem } from './ExecutionItem';

export type Shift = 'manha' | 'tarde' | 'noite';
export type ExecutionStatus = 'in_progress' | 'completed' | 'incomplete';
export type FuelLevel = 'vazio' | 'quarto' | 'metade' | 'tres_quartos' | 'cheio';

export interface ChecklistExecutionAttributes {
  id: string;
  templateId: string;
  vehicleId: string;
  operatorId: string;
  shift: Shift;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date | null;
  syncedAt: Date | null;
  deviceId: string;
  appVersion: string;
  startedLat: number | null;
  startedLng: number | null;
  odometerKm: number | null;
  fuelLevel: FuelLevel | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChecklistExecutionCreationAttributes = Optional<
  ChecklistExecutionAttributes,
  'status' | 'completedAt' | 'syncedAt' | 'startedLat' | 'startedLng' | 'odometerKm' | 'fuelLevel' | 'createdAt' | 'updatedAt'
>;

export class ChecklistExecution
  extends Model<ChecklistExecutionAttributes, ChecklistExecutionCreationAttributes>
  implements ChecklistExecutionAttributes
{
  declare id: string;
  declare templateId: string;
  declare vehicleId: string;
  declare operatorId: string;
  declare shift: Shift;
  declare status: ExecutionStatus;
  declare startedAt: Date;
  declare completedAt: Date | null;
  declare syncedAt: Date | null;
  declare deviceId: string;
  declare appVersion: string;
  declare startedLat: number | null;
  declare startedLng: number | null;
  declare odometerKm: number | null;
  declare fuelLevel: FuelLevel | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare template?: ChecklistTemplate;
  declare vehicle?: Vehicle;
  declare operator?: User;
  declare items?: ExecutionItem[];
}

ChecklistExecution.init(
  {
    id: {
      // gerado no device (UUIDv4)
      type: DataTypes.UUID,
      primaryKey: true,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'template_id',
    },
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'vehicle_id',
    },
    operatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'operator_id',
    },
    shift: {
      type: DataTypes.ENUM('manha', 'tarde', 'noite'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'completed', 'incomplete'),
      allowNull: false,
      defaultValue: 'in_progress',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'started_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    syncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'synced_at',
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'device_id',
    },
    appVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'app_version',
    },
    startedLat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      field: 'started_lat',
    },
    startedLng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      field: 'started_lng',
    },
    odometerKm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'odometer_km',
    },
    fuelLevel: {
      type: DataTypes.ENUM('vazio', 'quarto', 'metade', 'tres_quartos', 'cheio'),
      allowNull: true,
      field: 'fuel_level',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'checklist_executions',
    modelName: 'ChecklistExecution',
  },
);
