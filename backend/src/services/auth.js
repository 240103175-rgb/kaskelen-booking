// Phone + one-time code sign-in. In the MVP the code is logged to the server console instead of sent by SMS.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { fail } from '../errors.js';

export const CODE_TTL_MS = 5 * 60 * 1000;
export const CODE_RESEND_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Normalizes Kazakhstan mobile numbers to +77XXXXXXXXX, or returns null. */
export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (!/^77\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

const hash = (code) => createHash('sha256').update(code).digest('hex');

export function createAuthService(repo, { now = Date.now, log = console.log } = {}) {
  return {
    async requestCode(phoneInput) {
      const phone = normalizePhone(phoneInput) ?? fail('invalid_phone', 400);
      const existing = await repo.getCode(phone);
      if (existing && now() - existing.createdAt < CODE_RESEND_MS) fail('too_soon', 429);
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await repo.saveCode({ phone, codeHash: hash(code), expiresAt: now() + CODE_TTL_MS, createdAt: now(), attempts: 0 });
      log(`[login code] ${phone} -> ${code}`);
      return { phone, code, expiresInSeconds: CODE_TTL_MS / 1000 };
    },

    async verifyCode(phoneInput, codeInput, nameInput) {
      const phone = normalizePhone(phoneInput) ?? fail('invalid_phone', 400);
      const row = await repo.getCode(phone);
      if (!row || row.expiresAt < now()) fail('wrong_code', 400);
      if (row.attempts >= MAX_ATTEMPTS) fail('too_many_attempts', 429);
      if (hash(String(codeInput ?? '').trim()) !== row.codeHash) {
        await repo.incrementCodeAttempts(phone);
        fail('wrong_code', 400);
      }
      await repo.deleteCode(phone);
      let user = await repo.findUserByPhone(phone);
      if (!user) user = await repo.createUser({ phone, name: null, role: 'player', lang: 'kk', createdAt: now() });
      const name = String(nameInput ?? '').trim().slice(0, 60);
      if (name && !user.name) user = await repo.updateUser(user.id, { name });
      const token = randomBytes(32).toString('hex');
      await repo.createSession({ token, userId: user.id, expiresAt: now() + SESSION_TTL_MS });
      return { token, user };
    },

    async userFromToken(token) {
      return token ? repo.findSessionUser(token, now()) : null;
    },

    async logout(token) {
      if (token) await repo.deleteSession(token);
    },

    async updateMe(user, { name, lang }) {
      const patch = {};
      if (lang !== undefined) {
        if (!['kk', 'ru'].includes(lang)) fail('validation_error', 400);
        patch.lang = lang;
      }
      if (name !== undefined) patch.name = String(name).trim().slice(0, 60) || null;
      return repo.updateUser(user.id, patch);
    },
  };
}
