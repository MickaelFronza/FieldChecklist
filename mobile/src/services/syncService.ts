import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '../lib/apiClient';
import {
  type ExecutionItemRow,
  type ExecutionRow,
  deleteExecutionAndItems,
  getExecutionById,
  getExecutionItems,
  getItemsWithUnsyncedPhotos,
  listPendingSyncExecutions,
  markExecutionSyncStatus,
  markPhotoUploaded,
} from '../db/executionsRepository';

interface SyncBatchResponse {
  syncQueueId: string;
  status: string;
}

// cria/atualiza a execucao e os itens dela no servidor (POST /sync/batch) e
// espera confirmar - SEM isso, o worker de upload de foto tenta atualizar um
// ExecutionItem que ainda nao existe no banco do servidor, "atualiza 0
// linhas" silenciosamente, e a foto fica orfa no MinIO pra sempre (upload deu
// certo, mas nenhum registro aponta pra ela). Usado tanto no envio final
// quanto antes de QUALQUER upload de foto progressivo, ja que uma foto pode
// ser tirada muito antes do checklist terminar.
async function registerExecutionShell(executionId: string): Promise<boolean> {
  const execution = await getExecutionById(executionId);
  if (!execution) return false;
  const items = await getExecutionItems(executionId);

  await apiClient.post<SyncBatchResponse>('/sync/batch', {
    deviceId: execution.device_id,
    appVersion: execution.app_version,
    execution: {
      id: execution.id,
      templateId: execution.template_id,
      vehicleId: execution.vehicle_id,
      operatorId: execution.operator_id,
      shift: execution.shift,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      startedLat: execution.started_lat,
      startedLng: execution.started_lng,
      odometerKm: execution.odometer_km,
      fuelLevel: execution.fuel_level,
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

  return waitForSyncDone(execution.id);
}

async function syncOneExecution(execution: ExecutionRow): Promise<void> {
  const items = await getExecutionItems(execution.id);

  await markExecutionSyncStatus(execution.id, 'syncing');

  const registered = await registerExecutionShell(execution.id);
  if (!registered) {
    // volta pra 'pending': o proximo ciclo do sync loop reenvia o mesmo
    // payload, que o backend trata como idempotente (mesmo execution_id +
    // mesmo hash nao duplica)
    await markExecutionSyncStatus(execution.id, 'pending');
    return;
  }

  // a maioria das fotos ja deve ter subido em segundo plano durante o
  // checklist (ver uploadPhotoInBackground) - isso aqui e' so uma rede de
  // seguranca pras que ainda nao confirmaram (ex.: tiradas sem internet)
  const itemsWithUnsyncedPhotos = items.filter((item) => item.photo_uri && !item.photo_synced);
  if (itemsWithUnsyncedPhotos.length > 0) {
    await uploadPhotos(itemsWithUnsyncedPhotos);
  }

  await cleanupLocalPhotos(items);
  await deleteExecutionAndItems(execution.id);
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

  // marca como enviado assim que o backend confirma o enfileiramento - antes
  // disso, um retry reenviaria a mesma foto do zero. NAO apaga photo_uri
  // (precisa continuar disponivel pro preview local enquanto o checklist
  // ainda esta em andamento).
  for (const item of items) {
    if (item.photo_uri) {
      await markPhotoUploaded(item.id);
    }
  }
}

// disparado assim que uma foto e' tirada (ChecklistScreen), sem bloquear a
// tela - o objetivo e' que a maior parte das fotos ja esteja no servidor
// antes do operador terminar o checklist, pra "Enviar" no final ser rapido
// (so o texto das respostas) em vez de subir tudo de uma vez ali. Falha
// silenciosamente (offline, etc.) - o retry periodico em segundo plano
// (ver backgroundSync.ts) e o proprio envio final pegam o que sobrar.
export async function uploadPhotoInBackground(item: ExecutionItemRow): Promise<void> {
  try {
    // garante que o ExecutionItem ja existe no servidor antes de tentar subir
    // a foto dele (ver registerExecutionShell) - sem isso a foto sobe pro
    // MinIO mas fica sem nenhum registro apontando pra ela
    const registered = await registerExecutionShell(item.execution_id);
    if (!registered) return;
    await uploadPhotos([item]);
  } catch {
    // sem problema - fica pendente ate o proximo retry
  }
}

// retry periodico de fotos que ainda nao confirmaram upload, de qualquer
// checklist em andamento (nao so os ja finalizados) - cobre o caso de uma
// foto tirada offline, que o uploadPhotoInBackground na hora nao conseguiu
export async function syncPendingPhotos(): Promise<void> {
  const items = await getItemsWithUnsyncedPhotos();
  if (items.length === 0) return;

  const itemsByExecution = new Map<string, ExecutionItemRow[]>();
  for (const item of items) {
    const list = itemsByExecution.get(item.execution_id) ?? [];
    list.push(item);
    itemsByExecution.set(item.execution_id, list);
  }

  for (const [executionId, executionItems] of itemsByExecution) {
    try {
      const registered = await registerExecutionShell(executionId);
      if (!registered) continue;
      await uploadPhotos(executionItems);
    } catch {
      // tenta de novo no proximo ciclo
    }
  }
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
