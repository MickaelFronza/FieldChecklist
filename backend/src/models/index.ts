import { User } from './User';
import { Machine } from './Machine';
import { ChecklistTemplate } from './ChecklistTemplate';
import { TemplateItem } from './TemplateItem';
import { ChecklistExecution } from './ChecklistExecution';
import { ExecutionItem } from './ExecutionItem';
import { SyncQueue } from './SyncQueue';
import { AuditLog } from './AuditLog';
import { UserDevice } from './UserDevice';

ChecklistTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(UserDevice, { foreignKey: 'userId', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ChecklistTemplate.hasMany(TemplateItem, { foreignKey: 'templateId', as: 'items' });
TemplateItem.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });

ChecklistExecution.belongsTo(ChecklistTemplate, { foreignKey: 'templateId', as: 'template' });
ChecklistExecution.belongsTo(Machine, { foreignKey: 'machineId', as: 'machine' });
ChecklistExecution.belongsTo(User, { foreignKey: 'operatorId', as: 'operator' });

ChecklistExecution.hasMany(ExecutionItem, { foreignKey: 'executionId', as: 'items' });
ExecutionItem.belongsTo(ChecklistExecution, { foreignKey: 'executionId', as: 'execution' });
ExecutionItem.belongsTo(TemplateItem, { foreignKey: 'templateItemId', as: 'templateItem' });

AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  User,
  Machine,
  ChecklistTemplate,
  TemplateItem,
  ChecklistExecution,
  ExecutionItem,
  SyncQueue,
  AuditLog,
  UserDevice,
};
