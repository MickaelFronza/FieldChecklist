import { getDatabase } from './database';
import type {
  ChecklistTemplate,
  ExecutionItemStatus,
  ExecutionStatus,
  Machine,
  Shift,
} from '../types/api';

export interface ExecutionRow {
  id: string;
  template_id: string;
  machine_id: string;
  operator_id: string;
  shift: Shift;
  status: ExecutionStatus;
  sync_status: 'local' | 'pending' | 'syncing' | 'done' | 'failed';
  sync_queue_id: string | null;
  started_at: string;
  completed_at: string | null;
  started_lat: number | null;
  started_lng: number | null;
  device_id: string;
  app_version: string;
}

export interface ExecutionItemRow {
  id: string;
  execution_id: string;
  template_item_id: string;
  status: ExecutionItemStatus;
  justification: string | null;
  photo_uri: string | null;
  photo_hash: string | null;
  marked_at: string | null;
}

// --- Cache de templates/maquinas (espelho de /templates/active e /machines/active) ---

export async function cacheTemplates(templates: ChecklistTemplate[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_templates');
    for (const template of templates) {
      await db.runAsync(
        'INSERT INTO cached_templates (id, name, machine_type, version, active, items_json) VALUES (?, ?, ?, ?, ?, ?)',
        template.id,
        template.name,
        template.machineType,
        template.version,
        template.active ? 1 : 0,
        JSON.stringify(template.items),
      );
    }
  });
}

export async function getCachedTemplates(): Promise<ChecklistTemplate[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    machine_type: string | null;
    version: number;
    active: number;
    items_json: string;
  }>('SELECT * FROM cached_templates WHERE active = 1');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    machineType: row.machine_type,
    version: row.version,
    active: Boolean(row.active),
    items: JSON.parse(row.items_json),
  }));
}

export async function cacheMachines(machines: Machine[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_machines');
    for (const machine of machines) {
      await db.runAsync(
        'INSERT INTO cached_machines (id, code, name, type, active) VALUES (?, ?, ?, ?, ?)',
        machine.id,
        machine.code,
        machine.name,
        machine.type,
        machine.active ? 1 : 0,
      );
    }
  });
}

export async function getCachedMachines(): Promise<Machine[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    code: string;
    name: string;
    type: string;
    active: number;
  }>('SELECT * FROM cached_machines WHERE active = 1 ORDER BY name ASC');

  return rows.map((row) => ({ ...row, active: Boolean(row.active) }));
}

// --- Execucoes (checklists) ---

export async function getExecutionById(executionId: string): Promise<ExecutionRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ExecutionRow>('SELECT * FROM executions WHERE id = ?', executionId);
  return row ?? null;
}

export async function findOpenExecution(
  operatorId: string,
  machineId: string,
  shift: Shift,
  dateISO: string,
): Promise<ExecutionRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ExecutionRow>(
    `SELECT * FROM executions
     WHERE operator_id = ? AND machine_id = ? AND shift = ? AND status = 'in_progress'
       AND started_at LIKE ? || '%'`,
    operatorId,
    machineId,
    shift,
    dateISO,
  );
  return row ?? null;
}

export async function createExecution(execution: ExecutionRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO executions
      (id, template_id, machine_id, operator_id, shift, status, sync_status, started_at, started_lat, started_lng, device_id, app_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    execution.id,
    execution.template_id,
    execution.machine_id,
    execution.operator_id,
    execution.shift,
    execution.status,
    execution.sync_status,
    execution.started_at,
    execution.started_lat,
    execution.started_lng,
    execution.device_id,
    execution.app_version,
  );
}

export async function getExecutionItems(executionId: string): Promise<ExecutionItemRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExecutionItemRow>(
    'SELECT * FROM execution_items WHERE execution_id = ?',
    executionId,
  );
}

export async function upsertExecutionItem(item: ExecutionItemRow): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM execution_items WHERE id = ?',
    item.id,
  );

  if (existing) {
    await db.runAsync(
      `UPDATE execution_items
       SET status = ?, justification = ?, photo_uri = ?, photo_hash = ?, marked_at = ?
       WHERE id = ?`,
      item.status,
      item.justification,
      item.photo_uri,
      item.photo_hash,
      item.marked_at,
      item.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO execution_items
        (id, execution_id, template_item_id, status, justification, photo_uri, photo_hash, marked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.execution_id,
      item.template_item_id,
      item.status,
      item.justification,
      item.photo_uri,
      item.photo_hash,
      item.marked_at,
    );
  }
}

export async function markExecutionCompleted(executionId: string, completedAtISO: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE executions SET status = 'completed', completed_at = ?, sync_status = 'pending' WHERE id = ?",
    completedAtISO,
    executionId,
  );
}

export async function listPendingSyncExecutions(): Promise<ExecutionRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ExecutionRow>(
    "SELECT * FROM executions WHERE status = 'completed' AND sync_status IN ('pending', 'failed')",
  );
}

export async function markExecutionSyncStatus(
  executionId: string,
  syncStatus: ExecutionRow['sync_status'],
  syncQueueId?: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE executions SET sync_status = ?, sync_queue_id = COALESCE(?, sync_queue_id) WHERE id = ?',
    syncStatus,
    syncQueueId ?? null,
    executionId,
  );
}

export async function markItemPhotoSynced(itemId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE execution_items SET photo_uri = NULL WHERE id = ?', itemId);
}

export async function deleteExecutionAndItems(executionId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM execution_items WHERE execution_id = ?', executionId);
    await db.runAsync('DELETE FROM executions WHERE id = ?', executionId);
  });
}
