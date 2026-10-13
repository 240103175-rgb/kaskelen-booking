import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { localToUtc } from '../src/time.js';

export const TODAY = '2026-10-13';
export const TOMORROW = '2026-10-14';
// 10:00 in Kaskelen on TODAY.
export const NOW = localToUtc(TODAY, 10);

export function setup() {
  const db = openDb(':memory:');
  seed(db, NOW);
  const owner = db.prepare("SELECT * FROM users WHERE role = 'owner'").get();
  const venue = db.prepare("SELECT * FROM venues WHERE name = 'Арена Қаскелең'").get();
  const [pitch, pitch2] = db.prepare('SELECT * FROM pitches WHERE venue_id = ? ORDER BY id').all(venue.id);
  const addUser = (phone, role = 'player') => {
    db.prepare('INSERT INTO users (phone, name, role, created_at) VALUES (?, ?, ?, ?)').run(phone, 'Test', role, NOW);
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  };
  const player = addUser('+77011111111');
  const player2 = addUser('+77012222222');
  return { db, owner, venue, pitch, pitch2, player, player2, addUser };
}
