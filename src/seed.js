// Demo data: one owner and three venues. Runs only when the database has no venues.
import { openDb } from './db.js';

export const DEMO_OWNER_PHONE = '+77010000001';

export function seed(db, now = Date.now()) {
  if (db.prepare('SELECT COUNT(*) AS n FROM venues').get().n > 0) return false;

  db.prepare("INSERT OR IGNORE INTO users (phone, name, role, created_at) VALUES (?, 'Ерлан', 'owner', ?)").run(DEMO_OWNER_PHONE, now);
  const ownerId = db.prepare('SELECT id FROM users WHERE phone = ?').get(DEMO_OWNER_PHONE).id;

  const venues = [
    { name: 'Арена Қаскелең', address: 'Наурызбай батыр көшесі, 12', open: 8, close: 24, day: 8000, evening: 12000, eveningStart: 18, pitches: ['1-алаң', '2-алаң'] },
    { name: 'Жастар стадионы', address: 'Абылай хан көшесі, 45', open: 9, close: 23, day: 7000, evening: 10000, eveningStart: 18, pitches: ['Негізгі алаң'] },
    { name: 'Goal Park', address: 'Тәуелсіздік көшесі, 3', open: 10, close: 24, day: 9000, evening: 14000, eveningStart: 19, pitches: ['Мини-футбол 5×5', 'Футбол 7×7'] },
  ];
  const insertVenue = db.prepare(
    `INSERT INTO venues (name, address, open_hour, close_hour, day_price, evening_price, evening_start_hour, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertPitch = db.prepare('INSERT INTO pitches (venue_id, name) VALUES (?, ?)');
  for (const v of venues) {
    const { lastInsertRowid } = insertVenue.run(v.name, v.address, v.open, v.close, v.day, v.evening, v.eveningStart, ownerId);
    for (const p of v.pitches) insertPitch.run(Number(lastInsertRowid), p);
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb();
  console.log(seed(db) ? 'Seeded demo venues.' : 'Database already has venues, nothing to do.');
}
