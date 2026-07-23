import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'admin' | 'manager' | 'operator';

export interface UserAttributes {
  id: string;
  name: string;
  pinHash: string | null;
  email: string | null;
  passwordHash: string | null;
  role: UserRole;
  active: boolean;
  maxDevices: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'pinHash' | 'email' | 'passwordHash' | 'active' | 'maxDevices' | 'createdAt' | 'updatedAt'
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare pinHash: string | null;
  declare email: string | null;
  declare passwordHash: string | null;
  declare role: UserRole;
  declare active: boolean;
  declare maxDevices: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
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
    pinHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'pin_hash',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'operator'),
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    maxDevices: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      field: 'max_devices',
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
    tableName: 'users',
    modelName: 'User',
  },
);
