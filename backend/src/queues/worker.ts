import { sequelize } from '../config/database';
import '../models';
import './syncQueue';
import './uploadQueue';
import './notificationQueue';
import { scheduleDailyAlertJob } from './dailyAlertQueue';

async function start(): Promise<void> {
  await sequelize.authenticate();
  console.log('Worker conectado ao banco de dados');

  await scheduleDailyAlertJob();

  console.log('Worker pronto: processando filas sync-checklist, upload-photos, notifications, daily-alerts');
}

start().catch((err) => {
  console.error('Falha ao iniciar worker', err);
  process.exit(1);
});
