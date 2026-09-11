import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH || './data/app.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id     INTEGER PRIMARY KEY,
    username        TEXT,
    first_name      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at  TEXT NOT NULL DEFAULT (datetime('now')),
    streak_count    INTEGER NOT NULL DEFAULT 0,
    streak_date     TEXT
  );

  CREATE TABLE IF NOT EXISTS lesson_completions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id     INTEGER NOT NULL REFERENCES users(telegram_id),
    module_index    INTEGER NOT NULL,
    lesson_index    INTEGER NOT NULL,
    quiz_correct    INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(telegram_id, module_index, lesson_index)
  );

  CREATE INDEX IF NOT EXISTS idx_completions_user
    ON lesson_completions(telegram_id);
`);
