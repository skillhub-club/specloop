import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}

export function initDb(): void {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      assigned_to TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Add priority column if table already exists without it
  const columns = d.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!columns.some(c => c.name === "priority")) {
    d.exec("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent'))");
  }
  // Add assigned_to column if table already exists without it
  if (!columns.some(c => c.name === "assigned_to")) {
    d.exec("ALTER TABLE tasks ADD COLUMN assigned_to TEXT DEFAULT NULL");
  }
}
