import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// app ainda em desenvolvimento (sem base instalada em producao): colunas
// novas sao adicionadas com ALTER TABLE best-effort em vez de um sistema de
// migrations versionado, ja que `CREATE TABLE IF NOT EXISTS` no schema nao
// atualiza tabelas que ja existem no device
async function applyIncrementalMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const statements = [
    'ALTER TABLE executions ADD COLUMN started_lat REAL',
    'ALTER TABLE executions ADD COLUMN started_lng REAL',
  ];

  for (const statement of statements) {
    await db.execAsync(statement).catch(() => {});
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('field_checklist.db').then(async (db) => {
      await db.execAsync(SCHEMA_SQL);
      await applyIncrementalMigrations(db);
      return db;
    });
  }
  return dbPromise;
}
