import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// lista gerenciavel de tipos (Trator, Caminhao, etc.) usada tanto pelo
// cadastro de Veiculo quanto pelo de Template - de proposito so guarda o
// "name" (sem FK em vehicles.type/checklist_templates.vehicle_type, que
// continuam string solta) pra nao arriscar nenhuma migracao/join nas tabelas
// ja existentes; excluir um tipo daqui so tira ele da lista de opcoes futura,
// nao afeta vehicles/templates que ja usam esse valor
export interface VehicleTypeAttributes {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleTypeCreationAttributes = Optional<VehicleTypeAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class VehicleType
  extends Model<VehicleTypeAttributes, VehicleTypeCreationAttributes>
  implements VehicleTypeAttributes
{
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

VehicleType.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
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
    tableName: 'vehicle_types',
    modelName: 'VehicleType',
  },
);
