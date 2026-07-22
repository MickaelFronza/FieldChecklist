import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type SyncQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface SyncQueueAttributes {
  id: string;
  deviceId: string;
  executionId: string;
  payloadHash: string;
  status: SyncQueueStatus;
  attempts: number;
  createdAt: Date;
  processedAt: Date | null;
}

export type SyncQueueCreationAttributes = Optional<
  SyncQueueAttributes,
  'id' | 'status' | 'attempts' | 'createdAt' | 'processedAt'
>;

export class SyncQueue extends Model<SyncQueueAttributes, SyncQueueCreationAttributes> implements SyncQueueAttributes {
  declare id: string;
  declare deviceId: string;
  declare executionId: string;
  declare payloadHash: string;
  declare status: SyncQueueStatus;
  declare attempts: number;
  declare createdAt: Date;
  declare processedAt: Date | null;
}

SyncQueue.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'device_id',
    },
    executionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'execution_id',
    },
    payloadHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'payload_hash',
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'done', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at',
    },
  },
  {
    sequelize,
    tableName: 'sync_queue',
    modelName: 'SyncQueue',
    updatedAt: false,
  },
);
