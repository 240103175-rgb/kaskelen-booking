import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  blockSlot,
  cancelBooking,
  confirmBooking,
  createBooking,
  getSchedule,
  slotPrice,
  unblockSlot,
  updateVenueSettings,
} from '../src/booking.js';
import { HOUR_MS, localToUtc } from '../src/time.js';
import { NOW, setup, TODAY, TOMORROW } from './helpers.js';

const rejects = (fn, code) => assert.throws(fn, (err) => err.code === code);

describe('time zone', () => {
  it('converts Asia/Almaty local time to UTC (UTC+5)', () => {
    assert.equal(new Date(localToUtc('2026-10-13', 10)).toISOString(), '2026-10-13T05:00:00.000Z');
    assert.equal(new Date(localToUtc('2026-10-13', 24)).toISOString(), '2026-10-13T19:00:00.000Z');
  });
});

describe('createBooking', () => {
  it('books a free future slot with the right price and pending status', () => {
    const { db, pitch, player } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 12, now: NOW });
    assert.equal(b.status, 'pending');
    assert.equal(b.price, 8000);
    assert.equal(b.start_at, localToUtc(TODAY, 12));
  });

  it('never allows two bookings for the same pitch and slot', () => {
    const { db, pitch, player, player2 } = setup();
    createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 20, now: NOW });
    rejects(() => createBooking(db, { resourceId: pitch.id, userId: player2.id, date: TODAY, hour: 20, now: NOW }), 'taken');
  });

  it('enforces the capacity rule in the database itself', () => {
    const { db, pitch, player, player2 } = setup();
    const insert = db.prepare('INSERT INTO bookings (resource_id, user_id, start_at, price, created_at) VALUES (?, ?, ?, 0, 0)');
    insert.run(pitch.id, player.id, 123);
    assert.throws(() => insert.run(pitch.id, player2.id, 123), /slot full/);
  });

  it('allows several people per slot up to the resource capacity', () => {
    const { db, lane, player, addUser } = setup();
    assert.equal(lane.capacity, 4);
    const users = [player, addUser('+77015550001'), addUser('+77015550002'), addUser('+77015550003')];
    for (const u of users) createBooking(db, { resourceId: lane.id, userId: u.id, date: TOMORROW, hour: 9, now: NOW });
    const fifth = addUser('+77015550004');
    rejects(() => createBooking(db, { resourceId: lane.id, userId: fifth.id, date: TOMORROW, hour: 9, now: NOW }), 'taken');
    const slot = getSchedule(db, lane.id, TOMORROW, NOW).find((s) => s.hour === 9);
    assert.equal(slot.status, 'full');
    assert.equal(slot.left, 0);
  });

  it('does not let one person take two places in the same slot', () => {
    const { db, lane, player } = setup();
    createBooking(db, { resourceId: lane.id, userId: player.id, date: TOMORROW, hour: 9, now: NOW });
    rejects(() => createBooking(db, { resourceId: lane.id, userId: player.id, date: TOMORROW, hour: 9, now: NOW }), 'already_booked');
    const slot = getSchedule(db, lane.id, TOMORROW, NOW, player.id).find((s) => s.hour === 9);
    assert.equal(slot.left, 3);
    assert.equal(slot.mine, true);
  });

  it('allows the same hour on a different pitch', () => {
    const { db, pitch, pitch2, player, player2 } = setup();
    createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 20, now: NOW });
    assert.ok(createBooking(db, { resourceId: pitch2.id, userId: player2.id, date: TODAY, hour: 20, now: NOW }));
  });

  it('frees the slot again after a cancellation', () => {
    const { db, pitch, player, player2 } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    cancelBooking(db, { bookingId: b.id, user: player, now: NOW });
    assert.ok(createBooking(db, { resourceId: pitch.id, userId: player2.id, date: TOMORROW, hour: 20, now: NOW }));
  });

  it('rejects past and current slots', () => {
    const { db, pitch, player } = setup();
    rejects(() => createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 9, now: NOW }), 'past_slot');
    rejects(() => createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 10, now: NOW }), 'past_slot');
  });

  it('rejects hours outside opening hours and invalid input', () => {
    const { db, pitch, player } = setup();
    for (const hour of [7, 24, 12.5, 'x']) {
      rejects(() => createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour, now: NOW }), 'invalid_slot');
    }
    rejects(() => createBooking(db, { resourceId: pitch.id, userId: player.id, date: '2026-02-30', hour: 12, now: NOW }), 'invalid_slot');
    rejects(() => createBooking(db, { resourceId: 9999, userId: player.id, date: TOMORROW, hour: 12, now: NOW }), 'not_found');
  });

  it('rejects blocked slots', () => {
    const { db, pitch, player, owner } = setup();
    blockSlot(db, { resourceId: pitch.id, date: TOMORROW, hour: 15, user: owner });
    rejects(() => createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 15, now: NOW }), 'blocked_slot');
  });
});

describe('slotPrice', () => {
  it('switches to the evening price exactly at the evening start hour', () => {
    const venue = { day_price: 8000, evening_price: 12000, evening_start_hour: 18 };
    assert.equal(slotPrice(venue, 17), 8000);
    assert.equal(slotPrice(venue, 18), 12000);
    assert.equal(slotPrice(venue, 23), 12000);
  });
});

describe('cancelBooking (3-hour rule)', () => {
  const at = (hoursBefore) => localToUtc(TOMORROW, 20) - hoursBefore * HOUR_MS;

  it('lets a player cancel more than 3 hours before', () => {
    const { db, pitch, player } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    assert.equal(cancelBooking(db, { bookingId: b.id, user: player, now: at(4) }).status, 'cancelled');
  });

  it('lets a player cancel exactly 3 hours before', () => {
    const { db, pitch, player } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    assert.equal(cancelBooking(db, { bookingId: b.id, user: player, now: at(3) }).status, 'cancelled');
  });

  it('refuses a player less than 3 hours before', () => {
    const { db, pitch, player } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    rejects(() => cancelBooking(db, { bookingId: b.id, user: player, now: at(3) + 1 }), 'too_late');
  });

  it('lets the owner cancel at any time', () => {
    const { db, pitch, player, owner } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    const cancelled = cancelBooking(db, { bookingId: b.id, user: owner, now: at(0.5) });
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.cancelled_by, owner.id);
  });

  it("refuses to cancel someone else's booking", () => {
    const { db, pitch, player, player2 } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    rejects(() => cancelBooking(db, { bookingId: b.id, user: player2, now: NOW }), 'forbidden');
  });

  it('refuses a second cancellation', () => {
    const { db, pitch, player } = setup();
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    cancelBooking(db, { bookingId: b.id, user: player, now: NOW });
    rejects(() => cancelBooking(db, { bookingId: b.id, user: player, now: NOW }), 'already_cancelled');
  });
});

describe('owner tools', () => {
  it('confirms pending bookings only for own venues', () => {
    const { db, pitch, player, owner, addUser } = setup();
    const otherOwner = addUser('+77013333333', 'owner');
    const b = createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    rejects(() => confirmBooking(db, { bookingId: b.id, user: otherOwner }), 'forbidden');
    rejects(() => confirmBooking(db, { bookingId: b.id, user: player }), 'forbidden');
    assert.equal(confirmBooking(db, { bookingId: b.id, user: owner }).status, 'confirmed');
    rejects(() => confirmBooking(db, { bookingId: b.id, user: owner }), 'invalid_status');
  });

  it('cannot block a booked slot, and can unblock a blocked one', () => {
    const { db, pitch, player, owner } = setup();
    createBooking(db, { resourceId: pitch.id, userId: player.id, date: TOMORROW, hour: 20, now: NOW });
    rejects(() => blockSlot(db, { resourceId: pitch.id, date: TOMORROW, hour: 20, user: owner }), 'taken');
    blockSlot(db, { resourceId: pitch.id, date: TOMORROW, hour: 21, user: owner });
    rejects(() => blockSlot(db, { resourceId: pitch.id, date: TOMORROW, hour: 21, user: owner }), 'blocked_slot');
    const block = db.prepare('SELECT * FROM blocks').get();
    rejects(() => unblockSlot(db, { blockId: block.id, user: player }), 'forbidden');
    unblockSlot(db, { blockId: block.id, user: owner });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM blocks').get().n, 0);
  });

  it('validates venue settings', () => {
    const { db, venue, owner, player } = setup();
    const good = { open_hour: '9', close_hour: '23', day_price: '7000', evening_price: '11000', evening_start_hour: '19' };
    rejects(() => updateVenueSettings(db, { venueId: venue.id, user: player, settings: good }), 'forbidden');
    rejects(() => updateVenueSettings(db, { venueId: venue.id, user: owner, settings: { ...good, open_hour: '23' } }), 'invalid_settings');
    rejects(() => updateVenueSettings(db, { venueId: venue.id, user: owner, settings: { ...good, close_hour: '25' } }), 'invalid_settings');
    rejects(() => updateVenueSettings(db, { venueId: venue.id, user: owner, settings: { ...good, day_price: '-1' } }), 'invalid_settings');
    const updated = updateVenueSettings(db, { venueId: venue.id, user: owner, settings: good });
    assert.equal(updated.open_hour, 9);
    assert.equal(updated.evening_price, 11000);
  });
});

describe('getSchedule', () => {
  it('lists every opening hour with the correct status', () => {
    const { db, pitch, player, owner } = setup();
    createBooking(db, { resourceId: pitch.id, userId: player.id, date: TODAY, hour: 12, now: NOW });
    blockSlot(db, { resourceId: pitch.id, date: TODAY, hour: 13, user: owner });
    const slots = getSchedule(db, pitch.id, TODAY, NOW);
    assert.equal(slots.length, 16); // 08:00–24:00
    const byHour = Object.fromEntries(slots.map((s) => [s.hour, s]));
    assert.equal(byHour[9].status, 'past');
    assert.equal(byHour[11].status, 'free');
    assert.equal(byHour[12].status, 'full');
    assert.equal(byHour[13].status, 'blocked');
    assert.equal(byHour[18].price, 12000);
  });
});
