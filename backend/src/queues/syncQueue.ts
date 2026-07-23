import { createQueue } from './connection';
import { ChecklistExecution, ExecutionItem, SyncQueue as SyncQueueModel } from '../models';
import { socketEmitter } from './emitter';
import { MANAGERS_ROOM } from '../sockets';
import type { ExecutionStatus, Shift } from '../models/ChecklistExecution';
import type { ExecutionItemStatus } from '../models/ExecutionItem';

export interface SyncBatchItemPayload {
  id: string;
  templateItemId: string;
  status: ExecutionItemStatus;
  justification?: string | null;
  photoHash?: string | null;
  markedAt: string;
}

export interface SyncBatchJobData {
  syncQueueId: string;
  deviceId: string;
  appVersion: string;
  execution: {
    id: string;
    templateId: string;
    vehicleId: string;
    operatorId: string;
    shift: Shift;
    status: ExecutionStatus;
    startedAt: string;
    completedAt?: string | null;
    startedLat?: number | null;
    startedLng?: number | null;
  };
  items: SyncBatchItemPayload[];
}

export const syncQueue = createQueue<SyncBatchJobData>('sync-checklist');

syncQueue.process(async (job) => {
  const { execution, items, deviceId, appVersion, syncQueueId } = job.data;

  const [executionRecord] = await ChecklistExecution.findOrCreate({
    where: { id: execution.id },
    defaults: {
      id: execution.id,
      templateId: execution.templateId,
      vehicleId: execution.vehicleId,
      operatorId: execution.operatorId,
      shift: execution.shift,
      status: execution.status,
      startedAt: new Date(execution.startedAt),
      completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
      startedLat: execution.startedLat ?? null,
      startedLng: execution.startedLng ?? null,
      syncedAt: new Date(),
      deviceId,
      appVersion,
    },
  });

  // server-wins em metadados (device_id/app_version nao sao reescritos aqui,
  // permanecem os da primeira sincronizacao); status/completedAt refletem o
  // ultimo envio pois um checklist so e enviado uma vez ao ser finalizado
  await executionRecord.update({
    status: execution.status,
    completedAt: execution.completedAt ? new Date(execution.completedAt) : executionRecord.completedAt,
    syncedAt: new Date(),
  });

  let hasNonConformance = false;

  for (const item of items) {
    // device-wins para markedAt: so e definido na criacao, nunca reescrito
    const [itemRecord] = await ExecutionItem.findOrCreate({
      where: { id: item.id },
      defaults: {
        id: item.id,
        executionId: execution.id,
        templateItemId: item.templateItemId,
        status: item.status,
        justification: item.justification ?? null,
        photoHash: item.photoHash ?? null,
        markedAt: new Date(item.markedAt),
        syncedAt: new Date(),
      },
    });

    await itemRecord.update({
      status: item.status,
      justification: item.justification ?? itemRecord.justification,
      photoHash: item.photoHash ?? itemRecord.photoHash,
      syncedAt: new Date(),
    });

    if (item.status === 'non_conformant') {
      hasNonConformance = true;
    }
  }

  await SyncQueueModel.update({ status: 'done', processedAt: new Date() }, { where: { id: syncQueueId } });

  socketEmitter.to(MANAGERS_ROOM).emit('execution:completed', { executionId: execution.id });

  if (hasNonConformance) {
    socketEmitter.to(MANAGERS_ROOM).emit('execution:alert', { executionId: execution.id });
  }
});
