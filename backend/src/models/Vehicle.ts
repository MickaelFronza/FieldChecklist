import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// so define o icone mostrado no app mobile - decidido de proposito separado
// do campo "type" (que fica livre, usado pro casamento com Templates) pra
// nao arriscar quebrar tipos ja cadastrados hoje
export type VehicleCategory = 'carro' | 'onibus' | 'navio' | 'caminhao' | 'trator' | 'moto' | 'outro';

export interface VehicleAttributes {
  id: string;
  code: string;
  name: string;
  type: string;
  category: VehicleCategory;
  plate: string | null;
  // null = manutencao preventiva desligada pra esse veiculo. km "atual" nao
  // fica aqui - e' calculado a partir do maior odometerKm ja registrado nos
  // checklists desse veiculo (ver vehicles.controller.ts)
  maintenanceIntervalKm: number | null;
  lastMaintenanceKm: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleCreationAttributes = Optional<
  VehicleAttributes,
  | 'id'
  | 'category'
  | 'plate'
  | 'maintenanceIntervalKm'
  | 'lastMaintenanceKm'
  | 'active'
  | 'createdAt'
  | 'updatedAt'
>;

export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
  declare id: string;
  declare code: string;
  declare name: string;
  declare type: string;
  declare category: VehicleCategory;
  declare plate: string | null;
  declare maintenanceIntervalKm: number | null;
  declare lastMaintenanceKm: number | null;
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
    category: {
      type: DataTypes.ENUM('carro', 'onibus', 'navio', 'caminhao', 'trator', 'moto', 'outro'),
      allowNull: false,
      defaultValue: 'outro',
    },
    plate: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    maintenanceIntervalKm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'maintenance_interval_km',
    },
    lastMaintenanceKm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'last_maintenance_km',
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
