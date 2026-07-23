import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface VehicleAttributes {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleCreationAttributes = Optional<VehicleAttributes, 'id' | 'active' | 'createdAt' | 'updatedAt'>;

export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
  declare id: string;
  declare code: string;
  declare name: string;
  declare type: string;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Vehicle.init(
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
    tableName: 'vehicles',
    modelName: 'Vehicle',
  },
);
