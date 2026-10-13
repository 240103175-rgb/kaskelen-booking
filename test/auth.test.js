import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CODE_TTL_MS, MAX_ATTEMPTS, normalizePhone, requestCode, userFromSession, verifyCode } from '../src/auth.js';
import { NOW, setup } from './helpers.js';

const quiet = () => {};
const rejects = (fn, code) => assert.throws(fn, (err) => err.code === code);

describe('normalizePhone', () => {
  it('accepts common Kazakhstan formats', () => {
    for (const input of ['+7 701 234 56 78', '87012345678', '7012345678', '8 (701) 234-56-78']) {
      assert.equal(normalizePhone(input), '+77012345678');
    }
  });

  it('rejects invalid numbers', () => {
    for (const input of ['', '123', '+7 901 234 56 78', '+1 701 234 5678', null]) {
      assert.equal(normalizePhone(input), null);
    }
  });
});

describe('login codes', () => {
  it('signs in a new user with the right code and creates a session', () => {
    const { db } = setup();
    const { code } = requestCode(db, '87075556677', NOW, quiet);
    const { user, token, isNew } = verifyCode(db, '+7 707 555 66 77', code, NOW + 1000);
    assert.equal(isNew, true);
    assert.equal(user.phone, '+77075556677');
    assert.equal(user.role, 'player');
    assert.equal(userFromSession(db, token, NOW + 2000).id, user.id);
  });

  it('logs the code to the console instead of sending SMS', () => {
    const { db } = setup();
    const lines = [];
    const { code } = requestCode(db, '87075556677', NOW, (l) => lines.push(l));
    assert.match(lines[0], new RegExp(`\\+77075556677 -> ${code}`));
  });

  it('rejects a wrong code, an expired code, and a reused code', () => {
    const { db } = setup();
    const { code } = requestCode(db, '87075556677', NOW, quiet);
    const wrong = code === '000000' ? '111111' : '000000';
    rejects(() => verifyCode(db, '87075556677', wrong, NOW), 'wrong_code');
    rejects(() => verifyCode(db, '87075556677', code, NOW + CODE_TTL_MS + 1), 'wrong_code');
    verifyCode(db, '87075556677', code, NOW);
    rejects(() => verifyCode(db, '87075556677', code, NOW), 'wrong_code');
  });

  it(`locks the code after ${MAX_ATTEMPTS} wrong attempts`, () => {
    const { db } = setup();
    const { code } = requestCode(db, '87075556677', NOW, quiet);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_ATTEMPTS; i++) rejects(() => verifyCode(db, '87075556677', wrong, NOW), 'wrong_code');
    rejects(() => verifyCode(db, '87075556677', code, NOW), 'too_many_attempts');
  });

  it('limits code requests to one per minute', () => {
    const { db } = setup();
    requestCode(db, '87075556677', NOW, quiet);
    rejects(() => requestCode(db, '87075556677', NOW + 30_000, quiet), 'too_soon');
    assert.ok(requestCode(db, '87075556677', NOW + 61_000, quiet));
  });

  it('expired sessions are not accepted', () => {
    const { db } = setup();
    const { code } = requestCode(db, '87075556677', NOW, quiet);
    const { token } = verifyCode(db, '87075556677', code, NOW);
    assert.equal(userFromSession(db, token, NOW + 31 * 24 * 3600 * 1000), null);
    assert.equal(userFromSession(db, 'nope', NOW), null);
  });
});
