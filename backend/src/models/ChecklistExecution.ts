import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ChecklistTemplate } from './ChecklistTemplate';
import type { Machine } from './Machine';
import type { User } from './User';
import type { ExecutionItem } from './ExecutionItem';

export type Shift = 'morning' | 'afternoon' | 'night';
export type ExecutionStatus = 'in_progress' | 'completed' | 'incomplete';

export interface ChecklistExecutionAttributes {
  id: string;
  templateId: string;
  machineId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export type ChecklistExecutionCreationAttributes = Optional<
  ChecklistExecutionAttributes,
  'status' | 'completedAt' | 'syncedAt' | 'startedLat' | 'startedLng' | 'createdAt' | 'updatedAt'
>;

export class ChecklistExecution
  extends Model<ChecklistExecutionAttributes, ChecklistExecutionCreationAttributes>
  implements ChecklistExecutionAttributes
{
  declare id: string;
  declare templateId: string;
  declare machineId: string;
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
  declare createdAt: Date;
  declare updatedAt: Date;

  declare template?: ChecklistTemplate;
  declare machine?: Machine;
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
    machineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'machine_id',
    },
    operatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'operator_id',
    },
    shift: {
      type: DataTypes.ENUM('morning', 'afternoon', 'night'),
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
