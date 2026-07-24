import { User } from './User';
import { Vehicle } from './Vehicle';
import { ChecklistTemplate } from './ChecklistTemplate';
import { TemplateItem } from './TemplateItem';
import { ChecklistExecution } from './ChecklistExecution';
import { ExecutionItem } from './ExecutionItem';
import { SyncQueue } from './SyncQueue';
import { AuditLog } from './AuditLog';
import { UserDevice } from './UserDevice';
import { AppSettings } from './AppSettings';
import { VehicleOperator } from './VehicleOperator';
import { VehicleType } from './VehicleType';

ChecklistTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(UserDevice, { foreignKey: 'userId', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ChecklistTemplate.hasMany(TemplateItem, { foreignKey: 'templateId', as: 'items' });
TemplateItem.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

ChecklistExecution.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });
ChecklistExecution.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
ChecklistExecution.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

ChecklistExecution.hasMany(ExecutionItem, { foreignKey: 'executionId', as: 'items' });
ExecutionItem.belongsTo(ChecklistExecution, { foreignKey: 'executionId', as: 'execution' });
ExecutionItem.belongsTo(TemplateItem, { foreignKey: 'templateItemId', as: 'templateItem' });

AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.belongsToMany(User, { through: VehicleOperator, foreignKey: 'vehicleId', otherKey: 'userId', as: 'operators' });
User.belongsToMany(Vehicle, { through: VehicleOperator, foreignKey: 'userId', otherKey: 'vehicleId', as: 'vehicles' });
VehicleOperator.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
VehicleOperator.belongsTo(User, { foreignKey: 'userId', as: 'operator' });

export {
  User,
  Vehicle,
  ChecklistTemplate,
  TemplateItem,
  ChecklistExecution,
  ExecutionItem,
  SyncQueue,
  AuditLog,
  UserDevice,
  AppSettings,
  VehicleOperator,
  VehicleType,
};
