import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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
  name               TEXT NOT NULL,
  address            TEXT NOT NULL,
  photo_url          TEXT,
  open_hour          INTEGER NOT NULL,
  close_hour         INTEGER NOT NULL,
  day_price          INTEGER NOT NULL CHECK (day_price >= 0),
  evening_price      INTEGER NOT NULL CHECK (evening_price >= 0),
  evening_start_hour INTEGER NOT NULL,
  owner_id           INTEGER REFERENCES users(id),
  CHECK (open_hour >= 0 AND close_hour <= 24 AND open_hour < close_hour)
);

CREATE TABLE IF NOT EXISTS pitches (
  id       INTEGER PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id           INTEGER PRIMARY KEY,
  pitch_id     INTEGER NOT NULL REFERENCES pitches(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  start_at     INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  cancelled_by INTEGER REFERENCES users(id),
  created_at   INTEGER NOT NULL
);

-- The double-booking guarantee: one non-cancelled booking per pitch per slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_slot
  ON bookings (pitch_id, start_at) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_user ON bookings (user_id, start_at);

CREATE TABLE IF NOT EXISTS blocks (
  id       INTEGER PRIMARY KEY,
  pitch_id INTEGER NOT NULL REFERENCES pitches(id),
  start_at INTEGER NOT NULL,
  reason   TEXT,
  UNIQUE (pitch_id, start_at)
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
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

export function isUniqueViolation(err) {
  return /UNIQUE constraint failed/.test(err?.message ?? '');
}
