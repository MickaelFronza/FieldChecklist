import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MachineAttributes {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MachineCreationAttributes = Optional<MachineAttributes, 'id' | 'active' | 'createdAt' | 'updatedAt'>;

export class Machine extends Model<MachineAttributes, MachineCreationAttributes> implements MachineAttributes {
  declare id: string;
  declare code: string;
  declare name: string;
  declare type: string;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Machine.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'machines',
    modelName: 'Machine',
  },
);
