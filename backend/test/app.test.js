// End-to-end checks through HTTP: sign in, book, see the booking, owner confirms.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { keysFor } from '../src/i18n.js';
import { NOW, setup, TOMORROW } from './helpers.js';

let server;
let base;
let ctx;

before(async () => {
  ctx = setup();
  const app = createApp({ db: ctx.db, now: () => NOW, log: () => {} });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const form = (data) => new URLSearchParams(data).toString();

async function post(path, data, cookie = '') {
  return fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie, referer: `${base}${path}` },
    body: form(data),
  });
}

async function signIn(phone, name = 'Test') {
  const { requestCode } = await import('../src/auth.js');
  // Request through HTTP so the route works, then issue a known code directly for the test.
  await post('/login', { phone, next: '/' });
  ctx.db.prepare('DELETE FROM login_codes').run();
  const { code } = requestCode(ctx.db, phone, NOW, () => {});
  const res = await post('/login/verify', { phone, code, name, next: '/' });
  assert.equal(res.status, 302);
  return res.headers.get('set-cookie').split(';')[0];
}

describe('HTTP', () => {
  it('shows venues on the home page in Kazakh by default', async () => {
    const res = await fetch(`${base}/`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Арена Қаскелең/);
    assert.match(html, /Санаттар/);
  });

  it('filters venues by category and search text', async () => {
    const html = await (await fetch(`${base}/?category=barbershop`)).text();
    assert.match(html, /Sharp Barber/);
    assert.doesNotMatch(html, /href="\/venues\/\d+"[^>]*>[\s\S]*?Арена Қаскелең/);
    const search = await (await fetch(`${base}/?q=${encodeURIComponent('бассейн')}`)).text();
    assert.match(search, /Толқын бассейні/);
  });

  it('switches to Russian', async () => {
    const res = await fetch(`${base}/`, { headers: { cookie: 'lang=ru' } });
    assert.match(await res.text(), /Категории/);
  });

  it('shows the schedule of a venue', async () => {
    const res = await fetch(`${base}/venues/${ctx.venue.id}?date=${TOMORROW}`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /08:00/);
    assert.match(html, /23:00/);
  });

  it('returns 404 for unknown venues', async () => {
    assert.equal((await fetch(`${base}/venues/999`)).status, 404);
  });

  it('redirects anonymous users to login when booking', async () => {
    const res = await post('/bookings', { resourceId: ctx.pitch.id, date: TOMORROW, hour: 20 });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /^\/login/);
  });

  it('lets a player book, see the booking, and blocks a second player', async () => {
    const cookie = await signIn('+77071234567', 'Айдос');
    const res = await post('/bookings', { resourceId: ctx.pitch.id, date: TOMORROW, hour: 20 }, cookie);
    assert.equal(res.headers.get('location'), '/me?ok=booked');
    const me = await (await fetch(`${base}/me`, { headers: { cookie } })).text();
    assert.match(me, /Арена Қаскелең/);
    assert.match(me, /20:00/);

    const cookie2 = await signIn('+77077654321');
    const res2 = await post('/bookings', { resourceId: ctx.pitch.id, date: TOMORROW, hour: 20 }, cookie2);
    assert.match(res2.headers.get('location'), /err=taken/);
  });

  it('lets the owner see and confirm the booking', async () => {
    const cookie = await signIn('+77010000001');
    const page = await (await fetch(`${base}/owner?venue=${ctx.venue.id}&date=${TOMORROW}`, { headers: { cookie } })).text();
    assert.match(page, /Айдос/);
    const booking = ctx.db.prepare("SELECT * FROM bookings WHERE status = 'pending'").get();
    const res = await post(`/owner/bookings/${booking.id}/confirm`, {}, cookie);
    assert.match(res.headers.get('location'), /ok=confirmed/);
    assert.equal(ctx.db.prepare('SELECT status FROM bookings WHERE id = ?').get(booking.id).status, 'confirmed');
  });

  it('keeps players out of the owner panel', async () => {
    const cookie = await signIn('+77071234567');
    assert.equal((await fetch(`${base}/owner`, { headers: { cookie } })).status, 403);
  });

  it('does not redirect to other sites after login', async () => {
    const res = await fetch(`${base}/login?next=//evil.example`, { redirect: 'manual' });
    assert.match(await res.text(), /name="next" value="\/"/);
  });

  it('escapes user input in pages', async () => {
    const cookie = await signIn('+77079998877', '<script>alert(1)</script>');
    await post('/bookings', { resourceId: ctx.pitch.id, date: TOMORROW, hour: 21 }, cookie);
    const owner = await signIn('+77010000001');
    const page = await (await fetch(`${base}/owner?venue=${ctx.venue.id}&date=${TOMORROW}`, { headers: { cookie: owner } })).text();
    assert.doesNotMatch(page, /<script>alert/);
    assert.match(page, /&lt;script&gt;/);
  });
});

describe('translations', () => {
  it('has the same keys in Kazakh and Russian', () => {
    assert.deepEqual(keysFor('ru').sort(), keysFor('kk').sort());
  });
});
