// ============================================================
// SQLite Local Persistence Layer
// ============================================================
import * as SQLite from 'expo-sqlite';
import { TriageRecord, SyncStatus } from '../types';

const DB_NAME = 'paramedic_triage.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or creates) the SQLite database and ensures the table exists.
 * Call this once at app startup.
 */
export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Set WAL mode for better concurrent performance
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Create the triage_records table if it doesn't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS triage_records (
      id TEXT PRIMARY KEY NOT NULL,
      patientName TEXT NOT NULL,
      conditionDescription TEXT NOT NULL,
      priorityLevel INTEGER NOT NULL,
      status TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'queued',
      createdAt INTEGER NOT NULL,
      syncedAt INTEGER,
      retryCount INTEGER DEFAULT 0
    );
  `);

  console.log('[DB] Database initialized successfully');
};

const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('[DB] Database not initialized. Call initDatabase() first.');
  return db;
};

/**
 * Inserts a new triage record into local storage.
 */
export const insertRecord = async (record: TriageRecord): Promise<void> => {
  const database = getDb();
  await database.runAsync(
    `INSERT INTO triage_records
      (id, patientName, conditionDescription, priorityLevel, status, syncStatus, createdAt, syncedAt, retryCount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.patientName,
      record.conditionDescription,
      record.priorityLevel,
      record.status,
      record.syncStatus,
      record.createdAt,
      record.syncedAt ?? null,
      record.retryCount ?? 0,
    ]
  );
  console.log(`[DB] Inserted record ${record.id}`);
};

/**
 * Fetches all records with syncStatus = 'queued' or 'failed' (pending upload).
 */
export const getQueuedRecords = async (): Promise<TriageRecord[]> => {
  const database = getDb();
  const rows = await database.getAllAsync<TriageRecord>(
    `SELECT * FROM triage_records WHERE syncStatus IN ('queued', 'failed') ORDER BY createdAt ASC`
  );
  return rows;
};

/**
 * Fetches all records ordered newest first (for the queue screen).
 */
export const getAllRecords = async (): Promise<TriageRecord[]> => {
  const database = getDb();
  const rows = await database.getAllAsync<TriageRecord>(
    `SELECT * FROM triage_records ORDER BY createdAt DESC`
  );
  console.log(`[DB] Fetched ${rows.length} records`);
  return rows;
};

/**
 * Updates the syncStatus (and optionally syncedAt) for a given record.
 */
export const updateSyncStatus = async (
  id: string,
  syncStatus: SyncStatus,
  syncedAt?: number
): Promise<void> => {
  const database = getDb();
  if (syncedAt !== undefined) {
    await database.runAsync(
      `UPDATE triage_records SET syncStatus = ?, syncedAt = ? WHERE id = ?`,
      [syncStatus, syncedAt, id]
    );
  } else {
    await database.runAsync(
      `UPDATE triage_records SET syncStatus = ? WHERE id = ?`,
      [syncStatus, id]
    );
  }
  console.log(`[DB] Updated record ${id} → syncStatus: ${syncStatus}`);
};

/**
 * Increments the retry counter for a record that failed to sync.
 */
export const incrementRetryCount = async (id: string): Promise<void> => {
  const database = getDb();
  await database.runAsync(
    `UPDATE triage_records SET retryCount = retryCount + 1 WHERE id = ?`,
    [id]
  );
};

/**
 * Returns the count of records that are still pending sync.
 */
export const getPendingCount = async (): Promise<number> => {
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM triage_records WHERE syncStatus IN ('queued', 'failed')`
  );
  return result?.count ?? 0;
};
