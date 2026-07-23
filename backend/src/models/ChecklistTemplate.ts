import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { TemplateItem } from './TemplateItem';
import type { User } from './User';

export interface ChecklistTemplateAttributes {
  id: string;
  name: string;
  vehicleType: string | null;
  version: number;
  active: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChecklistTemplateCreationAttributes = Optional<
  ChecklistTemplateAttributes,
  'id' | 'vehicleType' | 'version' | 'active' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

export class ChecklistTemplate
  extends Model<ChecklistTemplateAttributes, ChecklistTemplateCreationAttributes>
  implements ChecklistTemplateAttributes
{
  declare id: string;
  declare name: string;
  declare vehicleType: string | null;
  declare version: number;
  declare active: boolean;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare items?: TemplateItem[];
  declare creator?: User;
}

ChecklistTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    vehicleType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'vehicle_type',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
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
    tableName: 'checklist_templates',
    modelName: 'ChecklistTemplate',
  },
);
