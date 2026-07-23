import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { User } from './User';

export interface UserDeviceAttributes {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string | null;
  active: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export type UserDeviceCreationAttributes = Optional<
  UserDeviceAttributes,
  'id' | 'deviceName' | 'active' | 'firstSeenAt' | 'lastSeenAt'
>;

export class UserDevice
  extends Model<UserDeviceAttributes, UserDeviceCreationAttributes>
  implements UserDeviceAttributes
{
  declare id: string;
  declare userId: string;
  declare deviceId: string;
  declare deviceName: string | null;
  declare active: boolean;
  declare firstSeenAt: Date;
  declare lastSeenAt: Date;

  declare user?: User;
}

UserDevice.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    deviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'device_id',
    },
    deviceName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'device_name',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    firstSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'first_seen_at',
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'last_seen_at',
    },
  },
  {
    sequelize,
    tableName: 'user_devices',
    modelName: 'UserDevice',
    timestamps: false,
  },
);
