const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/cricket.db');
const dataDir = path.dirname(DB_PATH);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Base schema (CREATE TABLE IF NOT EXISTS — safe to re-run) ──
const migrationPath = path.join(__dirname, '../migrations/001_init.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
db.exec(migration);

// ── Column migrations for existing DBs ────────────────────────
// If the volume has an old DB, it may be missing newer columns.
// ALTER TABLE ADD COLUMN is safe and idempotent via the PRAGMA check.
const existingCols = db
  .prepare('PRAGMA table_info(match)')
  .all()
  .map((c) => c.name);

const colMigrations = [
  "ALTER TABLE match ADD COLUMN time_slot     TEXT    NOT NULL DEFAULT ''",
  "ALTER TABLE match ADD COLUMN match_order   INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE match ADD COLUMN is_completed  INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE match ADD COLUMN is_paused     INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE match ADD COLUMN overs_limit   INTEGER NOT NULL DEFAULT 6",
];

const colNames = ['time_slot', 'match_order', 'is_completed', 'is_paused', 'overs_limit'];

colNames.forEach((col, i) => {
  if (!existingCols.includes(col)) {
    db.exec(colMigrations[i]);
    console.log(`[db] Added missing column: ${col}`);
  }
});

// ── ball_log table (safe to re-run) ──────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS ball_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id  INTEGER NOT NULL,
    over_num  INTEGER NOT NULL,
    ball_num  INTEGER NOT NULL,
    result    TEXT    NOT NULL,
    runs      INTEGER NOT NULL DEFAULT 0,
    is_legal  INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (match_id) REFERENCES match(match_id) ON DELETE CASCADE
  )
`);

module.exports = db;
