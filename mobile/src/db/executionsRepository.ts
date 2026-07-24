import { getDatabase } from './database';
import type {
  ChecklistTemplate,
  ExecutionItemStatus,
  ExecutionStatus,
  FuelLevel,
  Vehicle,
  Shift,
} from '../types/api';

export interface ExecutionRow {
  id: string;
  template_id: string;
  vehicle_id: string;
  operator_id: string;
  shift: Shift;
  status: ExecutionStatus;
  sync_status: 'local' | 'pending' | 'syncing' | 'done' | 'failed';
  sync_queue_id: string | null;
  started_at: string;
  completed_at: string | null;
  started_lat: number | null;
  started_lng: number | null;
  odometer_km: number | null;
  fuel_level: FuelLevel | null;
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

// --- Cache de templates/veiculos (espelho de /templates/active e /vehicles/active) ---

export async function cacheTemplates(templates: ChecklistTemplate[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_templates');
    for (const template of templates) {
      await db.runAsync(
        'INSERT INTO cached_templates (id, name, vehicle_type, version, active, items_json) VALUES (?, ?, ?, ?, ?, ?)',
        template.id,
        template.name,
        template.vehicleType,
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
    vehicle_type: string | null;
    version: number;
    active: number;
    items_json: string;
  }>('SELECT * FROM cached_templates WHERE active = 1');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    vehicleType: row.vehicle_type,
    version: row.version,
    active: Boolean(row.active),
    items: JSON.parse(row.items_json),
  }));
}

export async function cacheVehicles(vehicles: Vehicle[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM cached_vehicles');
    for (const vehicle of vehicles) {
      await db.runAsync(
        'INSERT INTO cached_vehicles (id, code, name, type, category, plate, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        vehicle.id,
        vehicle.code,
        vehicle.name,
        vehicle.type,
        vehicle.category,
        vehicle.plate,
        vehicle.active ? 1 : 0,
      );
    }
  });
}

export async function getCachedVehicles(): Promise<Vehicle[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    code: string;
    name: string;
    type: string;
    category: Vehicle['category'];
    plate: string | null;
    active: number;
  }>('SELECT * FROM cached_vehicles WHERE active = 1 ORDER BY name ASC');

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
  vehicleId: string,
  shift: Shift,
  dateISO: string,
): Promise<ExecutionRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ExecutionRow>(
    `SELECT * FROM executions
     WHERE operator_id = ? AND vehicle_id = ? AND shift = ? AND status = 'in_progress'
       AND started_at LIKE ? || '%'`,
    operatorId,
    vehicleId,
    shift,
    dateISO,
  );
  return row ?? null;
}

export interface TodayExecutionSummary {
  id: string;
  vehicleName: string;
  shift: Shift;
  status: ExecutionStatus;
  startedAt: string;
}

// pra mostrar "o que voce ja fez hoje" na tela de sucesso do envio - so local
// (sem chamada ao backend), ja que o proprio device tem tudo que precisa
export async function getTodayExecutionsForOperator(
  operatorId: string,
  dateISO: string,
): Promise<TodayExecutionSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    vehicle_name: string | null;
    shift: Shift;
    status: ExecutionStatus;
    started_at: string;
  }>(
    `SELECT e.id, v.name as vehicle_name, e.shift, e.status, e.started_at
     FROM executions e
     LEFT JOIN cached_vehicles v ON v.id = e.vehicle_id
     WHERE e.operator_id = ? AND e.started_at LIKE ? || '%'
     ORDER BY e.started_at DESC`,
    operatorId,
    dateISO,
  );

  return rows.map((row) => ({
    id: row.id,
    vehicleName: row.vehicle_name ?? 'Veículo',
    shift: row.shift,
    status: row.status,
    startedAt: row.started_at,
  }));
}

export async function createExecution(execution: ExecutionRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO executions
      (id, template_id, vehicle_id, operator_id, shift, status, sync_status, started_at, started_lat, started_lng, odometer_km, fuel_level, device_id, app_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    execution.id,
    execution.template_id,
    execution.vehicle_id,
    execution.operator_id,
    execution.shift,
    execution.status,
    execution.sync_status,
    execution.started_at,
    execution.started_lat,
    execution.started_lng,
    execution.odometer_km,
    execution.fuel_level,
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
