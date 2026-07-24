export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS cached_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vehicle_type TEXT,
  version INTEGER NOT NULL,
  active INTEGER NOT NULL,
  items_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cached_vehicles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outro',
  plate TEXT,
  active INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  shift TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_queue_id TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  started_lat REAL,
  started_lng REAL,
  odometer_km INTEGER,
  fuel_level TEXT,
  device_id TEXT NOT NULL,
  app_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_items (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  template_item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  justification TEXT,
  photo_uri TEXT,
  photo_hash TEXT,
  photo_synced INTEGER NOT NULL DEFAULT 0,
  marked_at TEXT,
  FOREIGN KEY (execution_id) REFERENCES executions (id)
);
`;
