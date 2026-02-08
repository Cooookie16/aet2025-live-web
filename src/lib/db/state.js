import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'db', 'state.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    ensureSchema();
  }
  return db;
}

function ensureSchema() {
  const db = getDb();
  
  // Key-Value Store for flexible state
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000)
    )
  `);
}

export function getState(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
  if (!row) {return null;}
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function setState(key, value) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO kv_store (key, value, updated_at) 
    VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE SET 
      value = @value,
      updated_at = @updated_at
  `);
  
  stmt.run({
    key,
    value: JSON.stringify(value),
    updated_at: Date.now()
  });
}

// 取得完整狀態 (for /api/state GET)
export function getAllState() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM kv_store').all();
  const result = {};
  rows.forEach(row => {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {}
  });
  return result;
}
