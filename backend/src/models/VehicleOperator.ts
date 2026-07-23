import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { Vehicle } from './Vehicle';
import type { User } from './User';

export interface VehicleOperatorAttributes {
  id: string;
  vehicleId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleOperatorCreationAttributes = Optional<VehicleOperatorAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class VehicleOperator
  extends Model<VehicleOperatorAttributes, VehicleOperatorCreationAttributes>
  implements VehicleOperatorAttributes
{
  declare id: string;
  declare vehicleId: string;
  declare userId: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare vehicle?: Vehicle;
  declare operator?: User;
}

VehicleOperator.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'vehicle_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
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
    tableName: 'vehicle_operators',
    modelName: 'VehicleOperator',
  },
);
