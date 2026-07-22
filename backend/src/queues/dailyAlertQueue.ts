import { Op } from 'sequelize';
import { createQueue } from './connection';
import { User, ChecklistExecution } from '../models';
import { env } from '../config/env';
import { notificationQueue } from './notificationQueue';
import { MANAGERS_ROOM } from '../sockets';

export const dailyAlertQueue = createQueue<Record<string, never>>('daily-alerts');

dailyAlertQueue.process(async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const operators = await User.findAll({ where: { role: 'operator', active: true } });

  const startedExecutions = await ChecklistExecution.findAll({
    where: { startedAt: { [Op.gte]: startOfDay } },
    attributes: ['operatorId'],
  });
  const startedOperatorIds = new Set(startedExecutions.map((execution) => execution.operatorId));

  const lateOperators = operators.filter((operator) => !startedOperatorIds.has(operator.id));

  for (const operator of lateOperators) {
    await notificationQueue.add({
      room: MANAGERS_ROOM,
      event: 'operator:late',
      payload: { operatorId: operator.id, name: operator.name },
    });
  }
});

export async function scheduleDailyAlertJob(): Promise<void> {
  const [hour, minute] = env.lateChecklistAlertTime.split(':').map(Number);
  await dailyAlertQueue.add(
    {},
    {
      repeat: { cron: `${minute} ${hour} * * *` },
      jobId: 'daily-late-operator-check',
    },
  );
}
