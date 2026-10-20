// Drives the real HTTP API and checks every response against openapi.yml.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { loadContract } from './contract.js';
import { NOW, REPOSITORIES, setup, TOMORROW } from './helpers.js';

for (const [kind, makeRepo] of Object.entries(REPOSITORIES)) {
  describe(`API contract (${kind})`, () => {
    let server, base, ctx, contract;

    before(async () => {
      ctx = await setup(makeRepo);
      contract = await loadContract();
      const app = createApp({ repo: ctx.repo, now: () => NOW, devCodes: true, log: () => {} });
      await new Promise((resolve) => (server = app.listen(0, resolve)));
      base = `http://localhost:${server.address().port}/api/v1`;
    });
    after(async () => {
      server.close();
      await ctx.repo.close();
    });

    async function call(method, path, { body, token } = {}) {
      const res = await fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : undefined;
      contract.check(method, `/api/v1${path}`, res.status, data);
      return { status: res.status, data };
    }

    async function signIn(phone, name) {
      const { data } = await call('POST', '/auth/code', { body: { phone } });
      const res = await call('POST', '/auth/verify', { body: { phone, code: data.devCode, name } });
      return res.data.token;
    }

    it('public catalogue', async () => {
      assert.equal((await call('GET', '/categories')).data.length, 8);
      assert.equal((await call('GET', '/venues?category=pool')).data.length, 1);
      assert.equal((await call('GET', '/venues?category=nope')).status, 400);
      const venue = await call('GET', `/venues/${ctx.venue.id}`);
      assert.equal(venue.data.resources.length, 2);
      assert.equal((await call('GET', '/venues/99999')).status, 404);
      const sched = await call('GET', `/venues/${ctx.venue.id}/schedule?date=${TOMORROW}`);
      assert.equal(sched.data.date, TOMORROW);
      assert.equal((await call('GET', `/venues/${ctx.venue.id}/schedule?date=2099-01-01`)).data.date, sched.data.today);
    });

    it('sign-in errors and profile', async () => {
      assert.equal((await call('POST', '/auth/code', { body: { phone: '123' } })).data.error.code, 'invalid_phone');
      await call('POST', '/auth/code', { body: { phone: '+77070000001' } });
      assert.equal((await call('POST', '/auth/code', { body: { phone: '+77070000001' } })).status, 429);
      assert.equal((await call('POST', '/auth/verify', { body: { phone: '+77070000001', code: '000000' } })).status, 400);
      assert.equal((await call('GET', '/me')).status, 401);
      const token = await signIn('+77070000002', 'Айдос');
      const me = await call('PATCH', '/me', { token, body: { lang: 'ru' } });
      assert.equal(me.data.lang, 'ru');
      assert.equal((await call('PATCH', '/me', { token, body: { lang: 'en' } })).status, 400);
      assert.equal((await call('POST', '/auth/logout', { token })).status, 204);
      assert.equal((await call('GET', '/me', { token })).status, 401);
    });

    it('booking lifecycle with owner actions and refusals', async () => {
      const customer = await signIn('+77071234567', 'Бекзат');
      const other = await signIn('+77077654321');
      const owner = await signIn('+77010000001');
      const ref = { resourceId: ctx.pitch.id, date: TOMORROW, hour: 20 };

      assert.equal((await call('POST', '/bookings', { body: ref })).status, 401);
      const created = await call('POST', '/bookings', { token: customer, body: ref });
      assert.equal(created.status, 201);
      assert.equal(created.data.price, 12000);
      assert.equal((await call('POST', '/bookings', { token: other, body: ref })).data.error.code, 'taken');
      assert.equal((await call('POST', '/bookings', { token: customer, body: { ...ref, hour: 7 } })).data.error.code, 'invalid_slot');
      assert.equal((await call('POST', '/bookings', { token: customer, body: { ...ref, resourceId: 99999 } })).status, 404);

      const mine = await call('GET', `/venues/${ctx.venue.id}/schedule?date=${TOMORROW}`, { token: customer });
      assert.equal(mine.data.resources[0].slots.find((s) => s.hour === 20).mine, true);
      assert.equal((await call('GET', '/me/bookings', { token: customer })).data.length, 1);

      assert.equal((await call('GET', '/owner/venues', { token: customer })).status, 403);
      assert.equal((await call('GET', '/owner/venues', { token: owner })).data.length, 15);
      const os = await call('GET', `/owner/venues/${ctx.venue.id}/schedule?date=${TOMORROW}`, { token: owner });
      assert.equal(os.data.resources[0].slots.find((s) => s.hour === 20).bookings[0].customerName, 'Бекзат');
      assert.equal((await call('GET', `/owner/venues/${ctx.venue.id}/schedule`, { token: customer })).status, 403);

      assert.equal((await call('POST', `/bookings/${created.data.id}/cancel`, { token: other })).status, 403);
      assert.equal((await call('POST', `/owner/bookings/${created.data.id}/confirm`, { token: owner })).data.status, 'confirmed');
      assert.equal((await call('POST', `/owner/bookings/${created.data.id}/confirm`, { token: owner })).status, 409);
      assert.equal((await call('POST', `/bookings/${created.data.id}/cancel`, { token: customer })).data.status, 'cancelled');
      assert.equal((await call('POST', `/bookings/${created.data.id}/cancel`, { token: customer })).data.error.code, 'already_cancelled');

      const block = await call('POST', '/owner/blocks', { token: owner, body: { ...ref, hour: 21 } });
      assert.equal(block.status, 201);
      assert.equal((await call('POST', '/owner/blocks', { token: owner, body: { ...ref, hour: 21 } })).status, 409);
      assert.equal((await call('POST', '/owner/blocks', { token: customer, body: { ...ref, hour: 22 } })).status, 403);
      assert.equal((await call('DELETE', `/owner/blocks/${block.data.id}`, { token: owner })).status, 204);
      assert.equal((await call('DELETE', `/owner/blocks/${block.data.id}`, { token: owner })).status, 404);

      const settings = { openHour: 9, closeHour: 23, dayPrice: 7000, eveningPrice: 11000, eveningStartHour: 19 };
      assert.equal((await call('PATCH', `/owner/venues/${ctx.venue.id}`, { token: owner, body: { ...settings, closeHour: 25 } })).data.error.code, 'invalid_settings');
      assert.equal((await call('PATCH', `/owner/venues/${ctx.venue.id}`, { token: customer, body: settings })).status, 403);
      assert.equal((await call('PATCH', `/owner/venues/${ctx.venue.id}`, { token: owner, body: settings })).data.openHour, 9);
      assert.equal((await call('PATCH', '/owner/venues/99999', { token: owner, body: settings })).status, 404);
    });

    it('covers every operation in the contract', () => {
      const seen = new Set(contract.seen().map((s) => s.split(' ').slice(0, 2).join(' ')));
      const missing = contract.operations().filter((op) => !seen.has(op));
      assert.deepEqual(missing, []);
    });

    it('rejects malformed JSON and unknown endpoints with the Error schema', async () => {
      const res = await fetch(`${base}/bookings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'validation_error');
      const nf = await fetch(`${base}/nope`);
      assert.equal(nf.status, 404);
    });
  });
}
