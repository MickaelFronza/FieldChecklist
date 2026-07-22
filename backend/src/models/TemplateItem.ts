import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { ChecklistTemplate } from './ChecklistTemplate';

export interface TemplateItemAttributes {
  id: string;
  templateId: string;
  orderIndex: number;
  title: string;
  description: string | null;
  photoRequired: boolean;
  isBlocking: boolean;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateItemCreationAttributes = Optional<
  TemplateItemAttributes,
  'id' | 'description' | 'photoRequired' | 'isBlocking' | 'category' | 'createdAt' | 'updatedAt'
>;

export class TemplateItem
  extends Model<TemplateItemAttributes, TemplateItemCreationAttributes>
  implements TemplateItemAttributes
{
  declare id: string;
  declare templateId: string;
  declare orderIndex: number;
  declare title: string;
  declare description: string | null;
  declare photoRequired: boolean;
  declare isBlocking: boolean;
  declare category: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare template?: ChecklistTemplate;
}

TemplateItem.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'template_id',
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_index',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'photo_required',
    },
    isBlocking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_blocking',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
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
    tableName: 'template_items',
    modelName: 'TemplateItem',
  },
);
