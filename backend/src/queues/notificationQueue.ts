import { createQueue } from './connection';
import { socketEmitter } from './emitter';

export interface NotificationJobData {
  room: string;
  event: string;
  payload: Record<string, unknown>;
}

export const notificationQueue = createQueue<NotificationJobData>('notifications');

notificationQueue.process(async (job) => {
  const { room, event, payload } = job.data;
  socketEmitter.to(room).emit(event, payload);
});
