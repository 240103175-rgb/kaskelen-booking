// Business rules (_docs/plan.md §4), run against every repository implementation.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAuthService, MAX_ATTEMPTS, normalizePhone } from '../src/services/auth.js';
import { createBookingService, slotPrice } from '../src/services/booking.js';
import { HOUR_MS, localToUtc } from '../src/time.js';
import { NOW, REPOSITORIES, setup, TODAY, TOMORROW } from './helpers.js';

const rejects = (promise, code) => assert.rejects(promise, (err) => err.code === code);

describe('time and prices', () => {
  it('converts Asia/Almaty to UTC (UTC+5)', () => {
    assert.equal(new Date(localToUtc('2026-10-13', 10)).toISOString(), '2026-10-13T05:00:00.000Z');
  });
  it('switches to the evening price exactly at the evening start hour', () => {
    const v = { dayPrice: 8000, eveningPrice: 12000, eveningStartHour: 18 };
    assert.equal(slotPrice(v, 17), 8000);
    assert.equal(slotPrice(v, 18), 12000);
  });
  it('normalizes Kazakhstan numbers', () => {
    for (const p of ['+7 701 234 56 78', '87012345678', '7012345678']) assert.equal(normalizePhone(p), '+77012345678');
    for (const p of ['123', '+7 901 234 56 78', '']) assert.equal(normalizePhone(p), null);
  });
});

for (const [kind, makeRepo] of Object.entries(REPOSITORIES)) {
  describe(`booking rules (${kind})`, () => {
    const make = async (now = NOW) => {
      const ctx = await setup(makeRepo);
      return { ...ctx, svc: createBookingService(ctx.repo, { now: () => now }) };
    };
    const slot = (r, hour, date = TOMORROW) => ({ resourceId: r.id, date, hour });

    it('books a free slot as pending at the right price', async () => {
      const { svc, pitch, player } = await make();
      const b = await svc.createBooking(player, slot(pitch, 20));
      assert.equal(b.status, 'pending');
      assert.equal(b.price, 12000);
      assert.equal(b.startAt, new Date(localToUtc(TOMORROW, 20)).toISOString());
    });

    it('refuses past, invalid, unknown and blocked slots', async () => {
      const { svc, pitch, player, owner } = await make();
      await rejects(svc.createBooking(player, slot(pitch, 10, TODAY)), 'past_slot');
      for (const hour of [7, 24, 12.5]) await rejects(svc.createBooking(player, slot(pitch, hour)), 'invalid_slot');
      await rejects(svc.createBooking(player, { resourceId: pitch.id, date: '2026-02-30', hour: 12 }), 'invalid_slot');
      await rejects(svc.createBooking(player, { resourceId: 99999, date: TOMORROW, hour: 12 }), 'not_found');
      await svc.blockSlot(owner, slot(pitch, 15));
      await rejects(svc.createBooking(player, slot(pitch, 15)), 'blocked_slot');
    });

    it('never exceeds capacity: 1 for a pitch, 4 for a pool lane', async () => {
      const { svc, pitch, lane, player, player2, addUser } = await make();
      await svc.createBooking(player, slot(pitch, 20));
      await rejects(svc.createBooking(player2, slot(pitch, 20)), 'taken');
      for (let i = 0; i < 4; i++) await svc.createBooking(await addUser(), slot(lane, 9));
      await rejects(svc.createBooking(await addUser(), slot(lane, 9)), 'taken');
      const s = (await svc.publicSchedule(lane.venueId, TOMORROW)).resources[0].slots.find((x) => x.hour === 9);
      assert.equal(s.status, 'full');
      assert.equal(s.left, 0);
    });

    it('allows one place per person per slot and frees places on cancel', async () => {
      const { svc, lane, pitch, player, player2 } = await make();
      await svc.createBooking(player, slot(lane, 9));
      await rejects(svc.createBooking(player, slot(lane, 9)), 'already_booked');
      const b = await svc.createBooking(player, slot(pitch, 21));
      await svc.cancelBooking(player, b.id);
      assert.ok(await svc.createBooking(player2, slot(pitch, 21)));
    });

    it('applies the 3-hour cancellation rule to customers, not owners', async () => {
      const start = localToUtc(TOMORROW, 20);
      const at = (h) => start - h * HOUR_MS;
      const ctx = await make();
      const b1 = await ctx.svc.createBooking(ctx.player, slot(ctx.pitch, 20));
      const late = createBookingService(ctx.repo, { now: () => at(3) + 1 });
      await rejects(late.cancelBooking(ctx.player, b1.id), 'too_late');
      const exact = createBookingService(ctx.repo, { now: () => at(3) });
      assert.equal((await exact.cancelBooking(ctx.player, b1.id)).status, 'cancelled');
      const b2 = await ctx.svc.createBooking(ctx.player, slot(ctx.pitch2, 20));
      await rejects(ctx.svc.cancelBooking(ctx.player2, b2.id), 'forbidden');
      const ownerLate = createBookingService(ctx.repo, { now: () => at(0.5) });
      assert.equal((await ownerLate.cancelBooking(ctx.owner, b2.id)).status, 'cancelled');
      await rejects(ctx.svc.cancelBooking(ctx.owner, b2.id), 'already_cancelled');
    });

    it('lets only the owner confirm, block and unblock', async () => {
      const { svc, pitch, player, owner, addUser } = await make();
      const other = await addUser(undefined, 'owner');
      const b = await svc.createBooking(player, slot(pitch, 20));
      await rejects(svc.confirmBooking(other, b.id), 'forbidden');
      assert.equal((await svc.confirmBooking(owner, b.id)).status, 'confirmed');
      await rejects(svc.confirmBooking(owner, b.id), 'invalid_status');
      await rejects(svc.blockSlot(owner, slot(pitch, 20)), 'taken');
      const block = await svc.blockSlot(owner, slot(pitch, 21));
      await rejects(svc.blockSlot(owner, slot(pitch, 21)), 'blocked_slot');
      await rejects(svc.unblockSlot(other, block.id), 'forbidden');
      await svc.unblockSlot(owner, block.id);
      await rejects(svc.ownerVenues(player), 'forbidden');
      assert.equal((await svc.ownerVenues(other)).length, 0);
      assert.equal((await svc.ownerVenues(owner)).length, 15);
    });

    it('validates every venue setting', async () => {
      const { svc, venue, owner, player } = await make();
      const good = { openHour: 9, closeHour: 23, dayPrice: 7000, eveningPrice: 11000, eveningStartHour: 19 };
      await rejects(svc.updateVenueSettings(player, venue.id, good), 'forbidden');
      for (const bad of [{ openHour: 24 }, { closeHour: 0 }, { closeHour: 25 }, { openHour: 23, closeHour: 23 }, { eveningStartHour: 25 }, { dayPrice: -1 }, { eveningPrice: 1_000_001 }, { openHour: 9.5 }]) {
        await rejects(svc.updateVenueSettings(owner, venue.id, { ...good, ...bad }), 'invalid_settings');
      }
      const updated = await svc.updateVenueSettings(owner, venue.id, good);
      assert.equal(updated.openHour, 9);
      assert.equal(updated.resourceCount, 2);
    });

    it('refuses hours that would leave active future bookings outside (#41)', async () => {
      const { svc, repo, venue, pitch, owner, player } = await make();
      const base = { openHour: 8, closeHour: 24, dayPrice: 8000, eveningPrice: 12000, eveningStartHour: 18 };
      const b = await svc.createBooking(player, slot(pitch, 20));
      await svc.confirmBooking(owner, b.id);
      await rejects(svc.updateVenueSettings(owner, venue.id, { ...base, closeHour: 20 }), 'hours_conflict');
      await rejects(svc.updateVenueSettings(owner, venue.id, { ...base, openHour: 21 }), 'hours_conflict');
      assert.equal((await repo.getVenue(venue.id)).closeHour, 24);
      await svc.createBooking(player, slot(pitch, 19));
      assert.equal((await svc.updateVenueSettings(owner, venue.id, { ...base, closeHour: 21 })).closeHour, 21);
      await svc.cancelBooking(owner, b.id);
      assert.equal((await svc.updateVenueSettings(owner, venue.id, { ...base, closeHour: 20 })).closeHour, 20);
      const past = await svc.createBooking(player, slot(pitch, 12, TODAY));
      assert.ok(past);
      const later = createBookingService(repo, { now: () => NOW + 3 * HOUR_MS });
      assert.equal((await later.updateVenueSettings(owner, venue.id, { ...base, openHour: 13, closeHour: 20 })).openHour, 13);
    });

    it('builds a schedule with every status and the caller marker', async () => {
      const { svc, pitch, player, owner, venue } = await make();
      await svc.createBooking(player, slot(pitch, 12, TODAY));
      await svc.blockSlot(owner, slot(pitch, 13, TODAY));
      const s = await svc.publicSchedule(venue.id, TODAY, player);
      const byHour = Object.fromEntries(s.resources[0].slots.map((x) => [x.hour, x]));
      assert.equal(s.resources[0].slots.length, 16);
      assert.equal(byHour[9].status, 'past');
      assert.equal(byHour[11].status, 'free');
      assert.equal(byHour[12].status, 'full');
      assert.equal(byHour[12].mine, true);
      assert.equal(byHour[13].status, 'blocked');
      const os = await svc.ownerSchedule(owner, venue.id, TODAY);
      assert.equal(os.resources[0].slots.find((x) => x.hour === 12).bookings[0].customerPhone, '+77011111111');
    });

    it('filters and searches venues', async () => {
      const { svc } = await make();
      assert.equal((await svc.listVenues({ category: 'barbershop' })).length, 2);
      assert.equal((await svc.listVenues({ q: 'БАССЕЙН' }))[0].name, 'Толқын бассейні');
      assert.equal((await svc.categoryCounts()).reduce((a, c) => a + c.venueCount, 0), 15);
      await rejects(svc.listVenues({ category: 'nope' }), 'validation_error');
    });
  });

  describe(`sign-in (${kind})`, () => {
    it('issues, verifies, locks and expires codes', async () => {
      const { repo } = await setup(makeRepo);
      let now = NOW;
      const auth = createAuthService(repo, { now: () => now, log: () => {} });
      const { code } = await auth.requestCode('87075556677');
      await rejects(auth.requestCode('87075556677'), 'too_soon');
      const wrong = code === '000000' ? '111111' : '000000';
      await rejects(auth.verifyCode('87075556677', wrong), 'wrong_code');
      const { token, user } = await auth.verifyCode('+7 707 555 66 77', code, 'Айдос');
      assert.equal(user.role, 'player');
      assert.equal(user.name, 'Айдос');
      assert.equal((await auth.userFromToken(token)).id, user.id);
      await rejects(auth.verifyCode('87075556677', code), 'wrong_code');
      now += 61_000;
      const second = await auth.requestCode('87075556677');
      for (let i = 0; i < MAX_ATTEMPTS; i++) await rejects(auth.verifyCode('87075556677', second.code === '000000' ? '111111' : '000000'), 'wrong_code');
      await rejects(auth.verifyCode('87075556677', second.code), 'too_many_attempts');
      now += 31 * 24 * 3600 * 1000;
      assert.equal(await auth.userFromToken(token), null);
    });
  });
}
