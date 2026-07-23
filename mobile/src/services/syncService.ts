import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '../lib/apiClient';
import {
  type ExecutionItemRow,
  type ExecutionRow,
  deleteExecutionAndItems,
  getExecutionItems,
  listPendingSyncExecutions,
  markExecutionSyncStatus,
} from '../db/executionsRepository';

interface SyncBatchResponse {
  syncQueueId: string;
  status: string;
}

async function syncOneExecution(execution: ExecutionRow): Promise<void> {
  const items = await getExecutionItems(execution.id);

  await markExecutionSyncStatus(execution.id, 'syncing');

  const { data } = await apiClient.post<SyncBatchResponse>('/sync/batch', {
    deviceId: execution.device_id,
    appVersion: execution.app_version,
    execution: {
      id: execution.id,
      templateId: execution.template_id,
      machineId: execution.machine_id,
      operatorId: execution.operator_id,
      shift: execution.shift,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      startedLat: execution.started_lat,
      startedLng: execution.started_lng,
    },
    items: items.map((item) => ({
      id: item.id,
      templateItemId: item.template_item_id,
      status: item.status,
      justification: item.justification,
      photoHash: item.photo_hash,
      markedAt: item.marked_at ?? execution.started_at,
    })),
  });

  await markExecutionSyncStatus(execution.id, 'syncing', data.syncQueueId);

  const itemsWithPhotos = items.filter((item) => item.photo_uri);
  if (itemsWithPhotos.length > 0) {
    await uploadPhotos(itemsWithPhotos);
  }

  const done = await waitForSyncDone(execution.id);
  if (done) {
    await cleanupLocalPhotos(items);
    await deleteExecutionAndItems(execution.id);
  } else {
    // volta pra 'pending': o proximo ciclo do sync loop reenvia o mesmo
    // payload, que o backend trata como idempotente (mesmo execution_id +
    // mesmo hash nao duplica)
    await markExecutionSyncStatus(execution.id, 'pending');
  }
}

async function uploadPhotos(items: ExecutionItemRow[]): Promise<void> {
  const formData = new FormData();
  for (const item of items) {
    if (!item.photo_uri) continue;
    formData.append(
      item.id,
      { uri: item.photo_uri, name: `${item.id}.jpg`, type: 'image/jpeg' } as unknown as Blob,
    );
  }

  await apiClient.post('/sync/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

async function waitForSyncDone(executionId: string, attempts = 5, delayMs = 1500): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const { data } = await apiClient.get<{ status: string }>(`/sync/status/${executionId}`);
      if (data.status === 'done') return true;
    } catch {
      // tenta de novo no proximo attempt
    }
  }
  return false;
}

async function cleanupLocalPhotos(items: ExecutionItemRow[]): Promise<void> {
  await Promise.all(
    items
      .filter((item) => item.photo_uri)
      .map((item) => FileSystem.deleteAsync(item.photo_uri as string, { idempotent: true }).catch(() => {})),
  );
}

export async function syncPendingExecutions(): Promise<void> {
  const pending = await listPendingSyncExecutions();
  for (const execution of pending) {
    try {
      await syncOneExecution(execution);
    } catch {
      await markExecutionSyncStatus(execution.id, 'failed');
    }
  }
}
