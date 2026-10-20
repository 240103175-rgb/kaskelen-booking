// Iteration 5: data survives a restart and the database itself protects integrity.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createSqlRepository } from '../src/repositories/sql.js';
import { seed } from '../src/seedData.js';
import { createBookingService } from '../src/services/booking.js';
import { NOW, TOMORROW } from './helpers.js';

const fileUrl = () => `sqlite:${join(mkdtempSync(join(tmpdir(), 'kb-')), 'test.db')}`;

describe('persistence (sqlite file)', () => {
  it('keeps users, bookings, blocks and settings after the repository is reopened', async () => {
    const url = fileUrl();
    let repo = await createSqlRepository(url);
    await seed(repo, NOW);
    const owner = await repo.findUserByPhone('+77010000001');
    const user = await repo.createUser({ phone: '+77071112233', name: 'Айдос', role: 'player', lang: 'ru', createdAt: NOW });
    const venue = (await repo.listVenues()).find((v) => v.category === 'pool');
    const [lane] = await repo.listResources(venue.id);
    const svc = createBookingService(repo, { now: () => NOW });
    const booking = await svc.createBooking(user, { resourceId: lane.id, date: TOMORROW, hour: 9 });
    await svc.blockSlot(owner, { resourceId: lane.id, date: TOMORROW, hour: 10 });
    await svc.updateVenueSettings(owner, venue.id, { openHour: 8, closeHour: 21, dayPrice: 2000, eveningPrice: 2600, eveningStartHour: 18 });
    await repo.close();

    repo = await createSqlRepository(url);
    assert.equal(await seed(repo, NOW), false, 'seed must not run twice');
    assert.equal((await repo.findUserByPhone('+77071112233')).lang, 'ru');
    const again = createBookingService(repo, { now: () => NOW });
    const mine = await again.myBookings(user);
    assert.deepEqual(mine.map((b) => [b.id, b.status, b.price]), [[booking.id, 'pending', booking.price]]);
    const s = await again.publicSchedule(venue.id, TOMORROW, user);
    const byHour = Object.fromEntries(s.resources[0].slots.map((x) => [x.hour, x]));
    assert.equal(byHour[9].mine, true);
    assert.equal(byHour[9].left, 3);
    assert.equal(byHour[10].status, 'blocked');
    assert.equal((await repo.getVenue(venue.id)).closeHour, 21);
    await repo.close();
  });

  it('rejects broken references, invalid venues and duplicate places in the database', async () => {
    const repo = await createSqlRepository('sqlite::memory:');
    await seed(repo, NOW);
    await assert.rejects(repo.createResource({ venueId: 99999, name: 'x', capacity: 1 }), /FOREIGN KEY|foreign key/i);
    const v = (await repo.listVenues())[0];
    await assert.rejects(repo.createVenue({ ...v, id: undefined, openHour: 10, closeHour: 10 }), /openHour must be before closeHour/);
    await assert.rejects(repo.createResource({ venueId: v.id, name: 'x', capacity: 0 }), /Validation/);
    const [r] = await repo.listResources(v.id);
    const u = await repo.findUserByPhone('+77010000001');
    const { Booking } = repo.sequelize.models;
    await Booking.create({ resourceId: r.id, userId: u.id, startAt: 1, price: 0, createdAt: 0 });
    await assert.rejects(Booking.create({ resourceId: r.id, userId: u.id, startAt: 1, price: 0, createdAt: 0 }), /unique|UNIQUE/i);
    await repo.close();
  });

  it('serializes concurrent bookings for the last place', async () => {
    const repo = await createSqlRepository(fileUrl());
    await seed(repo, NOW);
    const venue = (await repo.listVenues()).find((x) => x.name === 'Арена Қаскелең');
    const [pitch] = await repo.listResources(venue.id);
    const svc = createBookingService(repo, { now: () => NOW });
    const users = await Promise.all([1, 2, 3, 4, 5].map((i) => repo.createUser({ phone: `+7707000000${i}`, role: 'player', lang: 'kk', createdAt: NOW })));
    const results = await Promise.allSettled(users.map((u) => svc.createBooking(u, { resourceId: pitch.id, date: TOMORROW, hour: 20 })));
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'taken'));
    await repo.close();
  });
});
