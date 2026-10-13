// Phone + one-time code sign-in. In the MVP the code is logged to the server console instead of sent by SMS.
import { createHash, randomBytes, randomInt } from 'node:crypto';

export const CODE_TTL_MS = 5 * 60 * 1000;
export const CODE_RESEND_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Normalizes Kazakhstan mobile numbers to +7XXXXXXXXXX, or returns null. */
export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (!/^77\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

const hash = (code) => createHash('sha256').update(code).digest('hex');

export function requestCode(db, phoneInput, now, log = console.log) {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new AuthError('invalid_phone');
  const existing = db.prepare('SELECT * FROM login_codes WHERE phone = ?').get(phone);
  if (existing && now - existing.created_at < CODE_RESEND_MS) throw new AuthError('too_soon');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  db.prepare(
    `INSERT INTO login_codes (phone, code_hash, expires_at, created_at, attempts) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT (phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       created_at = excluded.created_at, attempts = 0`,
  ).run(phone, hash(code), now + CODE_TTL_MS, now);
  log(`[login code] ${phone} -> ${code}`);
  return { phone, code };
}

export function verifyCode(db, phoneInput, codeInput, now) {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new AuthError('invalid_phone');
  const row = db.prepare('SELECT * FROM login_codes WHERE phone = ?').get(phone);
  if (!row || row.expires_at < now) throw new AuthError('wrong_code');
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts');
  if (hash(String(codeInput ?? '').trim()) !== row.code_hash) {
    db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone);
    throw new AuthError('wrong_code');
  }
  db.prepare('DELETE FROM login_codes WHERE phone = ?').run(phone);

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  const isNew = !user;
  if (isNew) {
    db.prepare('INSERT INTO users (phone, created_at) VALUES (?, ?)').run(phone, now);
    user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  }
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, now + SESSION_TTL_MS);
  return { user, token, isNew };
}

export function userFromSession(db, token, now) {
  if (!token) return null;
  return (
    db
      .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?')
      .get(token, now) ?? null
  );
}

export function endSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
