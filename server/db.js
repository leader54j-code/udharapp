import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  person_id TEXT NOT NULL REFERENCES people(id),
  description TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  order_date TEXT NOT NULL,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  person_id TEXT NOT NULL REFERENCES people(id),
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  payment_date TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, reference)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  person_id TEXT NOT NULL REFERENCES people(id),
  entry_type TEXT NOT NULL CHECK(entry_type IN ('charge','payment','adjustment')),
  amount_paise INTEGER NOT NULL CHECK(amount_paise != 0),
  description TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source_id TEXT,
  reverses_entry_id TEXT REFERENCES ledger_entries(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  original_entry_id TEXT NOT NULL REFERENCES ledger_entries(id),
  reversal_entry_id TEXT NOT NULL REFERENCES ledger_entries(id),
  replacement_entry_id TEXT REFERENCES ledger_entries(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_person ON ledger_entries(user_id, person_id);
CREATE INDEX IF NOT EXISTS idx_ledger_occurred ON ledger_entries(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_orders_due ON orders(user_id, due_date);

CREATE TRIGGER IF NOT EXISTS ledger_no_update
BEFORE UPDATE ON ledger_entries BEGIN
  SELECT RAISE(ABORT, 'Ledger entries are immutable');
END;
CREATE TRIGGER IF NOT EXISTS ledger_no_delete
BEFORE DELETE ON ledger_entries BEGIN
  SELECT RAISE(ABORT, 'Ledger entries cannot be deleted');
END;
CREATE TRIGGER IF NOT EXISTS payments_no_update
BEFORE UPDATE ON payments BEGIN
  SELECT RAISE(ABORT, 'Payments are immutable; create a correction');
END;
CREATE TRIGGER IF NOT EXISTS payments_no_delete
BEFORE DELETE ON payments BEGIN
  SELECT RAISE(ABORT, 'Payments cannot be deleted; create a correction');
END;
CREATE TRIGGER IF NOT EXISTS orders_no_financial_update
BEFORE UPDATE OF amount_paise, person_id ON orders BEGIN
  SELECT RAISE(ABORT, 'Financial order fields are immutable; create a correction');
END;
CREATE TRIGGER IF NOT EXISTS orders_no_delete
BEFORE DELETE ON orders BEGIN
  SELECT RAISE(ABORT, 'Orders cannot be deleted; create a correction');
END;
`

export function createDatabase(filename = process.env.DATABASE_PATH || './data/udhar.db') {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true })
  const db = new Database(filename)
  db.pragma('foreign_keys = ON')
  if (filename !== ':memory:') db.pragma('journal_mode = WAL')
  db.exec(schema)
  return db
}
