import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AppSettingsAttributes {
  id: number;
  maxTotalDevices: number | null;
  morningStartHour: number;
  afternoonStartHour: number;
  nightStartHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AppSettingsCreationAttributes = Optional<
  AppSettingsAttributes,
  'id' | 'maxTotalDevices' | 'morningStartHour' | 'afternoonStartHour' | 'nightStartHour' | 'createdAt' | 'updatedAt'
>;

export class AppSettings
  extends Model<AppSettingsAttributes, AppSettingsCreationAttributes>
  implements AppSettingsAttributes
{
  declare id: number;
  declare maxTotalDevices: number | null;
  declare morningStartHour: number;
  declare afternoonStartHour: number;
  declare nightStartHour: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

AppSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    maxTotalDevices: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_total_devices',
    },
    morningStartHour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'morning_start_hour',
    },
    afternoonStartHour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12,
      field: 'afternoon_start_hour',
    },
    nightStartHour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 18,
      field: 'night_start_hour',
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
    tableName: 'app_settings',
    modelName: 'AppSettings',
  },
);
