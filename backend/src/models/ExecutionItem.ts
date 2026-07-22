import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ChecklistExecution } from './ChecklistExecution';
import type { TemplateItem } from './TemplateItem';

export type ExecutionItemStatus = 'ok' | 'non_conformant' | 'not_applicable' | 'pending';

export interface ExecutionItemAttributes {
  id: string;
  executionId: string;
  templateItemId: string;
  status: ExecutionItemStatus;
  justification: string | null;
  photoKey: string | null;
  photoHash: string | null;
  markedAt: Date | null;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ExecutionItemCreationAttributes = Optional<
  ExecutionItemAttributes,
  'status' | 'justification' | 'photoKey' | 'photoHash' | 'markedAt' | 'syncedAt' | 'createdAt' | 'updatedAt'
>;

export class ExecutionItem
  extends Model<ExecutionItemAttributes, ExecutionItemCreationAttributes>
  implements ExecutionItemAttributes
{
  declare id: string;
  declare executionId: string;
  declare templateItemId: string;
  declare status: ExecutionItemStatus;
  declare justification: string | null;
  declare photoKey: string | null;
  declare photoHash: string | null;
  declare markedAt: Date | null;
  declare syncedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare execution?: ChecklistExecution;
  declare templateItem?: TemplateItem;
}

ExecutionItem.init(
  {
    id: {
      // gerado no device (UUIDv4)
      type: DataTypes.UUID,
      primaryKey: true,
    },
    executionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'execution_id',
    },
    templateItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'template_item_id',
    },
    status: {
      type: DataTypes.ENUM('ok', 'non_conformant', 'not_applicable', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
    justification: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'photo_key',
    },
    photoHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'photo_hash',
    },
    markedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'marked_at',
    },
    syncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'synced_at',
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
    tableName: 'execution_items',
    modelName: 'ExecutionItem',
  },
);
