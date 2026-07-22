import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { User } from './User';

export interface AuditLogAttributes {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  deviceId: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  'id' | 'userId' | 'entityId' | 'metadata' | 'deviceId' | 'createdAt'
>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: string;
  declare userId: string | null;
  declare action: string;
  declare entityType: string;
  declare entityId: string | null;
  declare metadata: Record<string, unknown> | null;
  declare deviceId: string | null;
  declare occurredAt: Date;
  declare createdAt: Date;

  declare user?: User;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'device_id',
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'occurred_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'audit_log',
    modelName: 'AuditLog',
    updatedAt: false,
  },
);
