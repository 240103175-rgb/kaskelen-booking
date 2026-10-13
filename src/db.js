import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Bump when the schema changes incompatibly. Older databases are rebuilt (MVP: demo data only).
const SCHEMA_VERSION = 2;
const OLD_TABLES = ['sessions', 'login_codes', 'blocks', 'bookings', 'pitches', 'resources', 'venues', 'users'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'owner', 'admin')),
  lang       TEXT NOT NULL DEFAULT 'kk' CHECK (lang IN ('kk', 'ru')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS venues (
  id                 INTEGER PRIMARY KEY,
  category           TEXT NOT NULL,
  name               TEXT NOT NULL,
  address            TEXT NOT NULL,
  description        TEXT,
  photo_url          TEXT,
  open_hour          INTEGER NOT NULL,
  close_hour         INTEGER NOT NULL,
  day_price          INTEGER NOT NULL CHECK (day_price >= 0),
  evening_price      INTEGER NOT NULL CHECK (evening_price >= 0),
  evening_start_hour INTEGER NOT NULL,
  owner_id           INTEGER REFERENCES users(id),
  CHECK (open_hour >= 0 AND close_hour <= 24 AND open_hour < close_hour)
);

-- A bookable unit of a venue: a pitch, a barber, a massage room, a pool lane, a table...
CREATE TABLE IF NOT EXISTS resources (
  id       INTEGER PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1)
);

CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER PRIMARY KEY,
  resource_id  INTEGER NOT NULL REFERENCES resources(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  start_at     INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  cancelled_by INTEGER REFERENCES users(id),
  created_at   INTEGER NOT NULL
);

-- No overbooking: active bookings per slot never exceed the resource capacity.
CREATE TRIGGER IF NOT EXISTS bookings_capacity BEFORE INSERT ON bookings
WHEN NEW.status <> 'cancelled'
BEGIN
  SELECT RAISE(ABORT, 'slot full')
  WHERE (SELECT COUNT(*) FROM bookings
         WHERE resource_id = NEW.resource_id AND start_at = NEW.start_at AND status <> 'cancelled')
     >= (SELECT capacity FROM resources WHERE id = NEW.resource_id);
END;

-- One active booking per user per slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_user_slot
  ON bookings (resource_id, start_at, user_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_slot ON bookings (resource_id, start_at);
CREATE INDEX IF NOT EXISTS bookings_user ON bookings (user_id, start_at);

CREATE TABLE IF NOT EXISTS blocks (
  id          INTEGER PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  start_at    INTEGER NOT NULL,
  reason      TEXT,
  UNIQUE (resource_id, start_at)
);

CREATE TABLE IF NOT EXISTS login_codes (
  phone      TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
`;

export function openDb(path = process.env.DB_PATH || 'data/kaskelen.db') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version < SCHEMA_VERSION) {
    db.exec('PRAGMA foreign_keys = OFF;');
    for (const table of OLD_TABLES) db.exec(`DROP TABLE IF EXISTS ${table};`);
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  return db;
}

export function isUniqueViolation(err) {
  return /UNIQUE constraint failed/.test(err?.message ?? '');
}

export function isSlotFull(err) {
  return /slot full/.test(err?.message ?? '');
}
