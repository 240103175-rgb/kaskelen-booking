// Business rules from _docs/plan.md §4.
import { isUniqueViolation } from './db.js';
import { HOUR_MS, isValidDate, localParts, localToUtc } from './time.js';

export const CANCEL_LIMIT_MS = 3 * HOUR_MS;

export class BookingError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function slotPrice(venue, hour) {
  return hour >= venue.evening_start_hour ? venue.evening_price : venue.day_price;
}

export function getVenue(db, venueId) {
  return db.prepare('SELECT * FROM venues WHERE id = ?').get(venueId);
}

export function listVenues(db) {
  return db
    .prepare(
      `SELECT v.*, COUNT(p.id) AS pitch_count
       FROM venues v LEFT JOIN pitches p ON p.venue_id = v.id
       GROUP BY v.id ORDER BY v.name`,
    )
    .all();
}

export function listPitches(db, venueId) {
  return db.prepare('SELECT * FROM pitches WHERE venue_id = ? ORDER BY name').all(venueId);
}

function getPitchWithVenue(db, pitchId) {
  const pitch = db.prepare('SELECT * FROM pitches WHERE id = ?').get(pitchId);
  if (!pitch) return null;
  return { pitch, venue: getVenue(db, pitch.venue_id) };
}

export function canManageVenue(user, venue) {
  return Boolean(user && venue && (user.role === 'admin' || venue.owner_id === user.id));
}

/** Slots of one pitch for one local date, with status free / booked / blocked / past. */
export function getSchedule(db, pitchId, date, now) {
  const found = getPitchWithVenue(db, pitchId);
  if (!found || !isValidDate(date)) return [];
  const { venue } = found;
  const from = localToUtc(date, venue.open_hour);
  const to = localToUtc(date, venue.close_hour);

  const bookings = new Map(
    db
      .prepare(
        `SELECT b.*, u.name AS user_name, u.phone AS user_phone
         FROM bookings b JOIN users u ON u.id = b.user_id
         WHERE b.pitch_id = ? AND b.start_at >= ? AND b.start_at < ? AND b.status <> 'cancelled'`,
      )
      .all(pitchId, from, to)
      .map((b) => [b.start_at, b]),
  );
  const blocks = new Map(
    db
      .prepare('SELECT * FROM blocks WHERE pitch_id = ? AND start_at >= ? AND start_at < ?')
      .all(pitchId, from, to)
      .map((b) => [b.start_at, b]),
  );

  const slots = [];
  for (let hour = venue.open_hour; hour < venue.close_hour; hour++) {
    const startAt = localToUtc(date, hour);
    const booking = bookings.get(startAt) ?? null;
    const block = blocks.get(startAt) ?? null;
    let status = 'free';
    if (booking) status = 'booked';
    else if (block) status = 'blocked';
    else if (startAt <= now) status = 'past';
    slots.push({ hour, startAt, price: slotPrice(venue, hour), status, booking, block });
  }
  return slots;
}

function resolveSlot(db, pitchId, date, hour) {
  const found = getPitchWithVenue(db, pitchId);
  if (!found) throw new BookingError('not_found');
  const h = Number(hour);
  if (!isValidDate(date) || !Number.isInteger(h) || h < found.venue.open_hour || h >= found.venue.close_hour) {
    throw new BookingError('invalid_slot');
  }
  return { ...found, hour: h, startAt: localToUtc(date, h) };
}

export function createBooking(db, { pitchId, userId, date, hour, now }) {
  const { venue, hour: h, startAt } = resolveSlot(db, pitchId, date, hour);
  if (startAt <= now) throw new BookingError('past_slot');
  if (db.prepare('SELECT 1 FROM blocks WHERE pitch_id = ? AND start_at = ?').get(pitchId, startAt)) {
    throw new BookingError('blocked_slot');
  }
  try {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO bookings (pitch_id, user_id, start_at, price, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(pitchId, userId, startAt, slotPrice(venue, h), now);
    return getBooking(db, Number(lastInsertRowid));
  } catch (err) {
    if (isUniqueViolation(err)) throw new BookingError('taken');
    throw err;
  }
}

export function getBooking(db, bookingId) {
  return db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, p.venue_id, v.name AS venue_name, v.address AS venue_address,
              v.owner_id, u.name AS user_name, u.phone AS user_phone
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
    )
    .get(bookingId);
}

export function userBookings(db, userId) {
  return db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.address AS venue_address
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       WHERE b.user_id = ? ORDER BY b.start_at DESC`,
    )
    .all(userId);
}

/** Players may cancel until 3 hours before start; venue owners and admins at any time. */
export function cancelBooking(db, { bookingId, user, now }) {
  const booking = getBooking(db, bookingId);
  if (!booking) throw new BookingError('not_found');
  const isManager = canManageVenue(user, { owner_id: booking.owner_id });
  if (booking.user_id !== user.id && !isManager) throw new BookingError('forbidden');
  if (booking.status === 'cancelled') throw new BookingError('already_cancelled');
  if (!isManager && booking.start_at - now < CANCEL_LIMIT_MS) throw new BookingError('too_late');
  db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_by = ? WHERE id = ?").run(user.id, bookingId);
  return getBooking(db, bookingId);
}

export function confirmBooking(db, { bookingId, user }) {
  const booking = getBooking(db, bookingId);
  if (!booking) throw new BookingError('not_found');
  if (!canManageVenue(user, { owner_id: booking.owner_id })) throw new BookingError('forbidden');
  if (booking.status !== 'pending') throw new BookingError('invalid_status');
  db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(bookingId);
  return getBooking(db, bookingId);
}

export function blockSlot(db, { pitchId, date, hour, user, reason = null }) {
  const { venue, startAt } = resolveSlot(db, pitchId, date, hour);
  if (!canManageVenue(user, venue)) throw new BookingError('forbidden');
  if (db.prepare("SELECT 1 FROM bookings WHERE pitch_id = ? AND start_at = ? AND status <> 'cancelled'").get(pitchId, startAt)) {
    throw new BookingError('taken');
  }
  try {
    db.prepare('INSERT INTO blocks (pitch_id, start_at, reason) VALUES (?, ?, ?)').run(pitchId, startAt, reason);
  } catch (err) {
    if (isUniqueViolation(err)) throw new BookingError('blocked_slot');
    throw err;
  }
}

export function unblockSlot(db, { blockId, user }) {
  const block = db.prepare('SELECT * FROM blocks WHERE id = ?').get(blockId);
  if (!block) throw new BookingError('not_found');
  const { venue } = getPitchWithVenue(db, block.pitch_id);
  if (!canManageVenue(user, venue)) throw new BookingError('forbidden');
  db.prepare('DELETE FROM blocks WHERE id = ?').run(blockId);
}

export function ownedVenues(db, user) {
  if (user.role === 'admin') return db.prepare('SELECT * FROM venues ORDER BY name').all();
  return db.prepare('SELECT * FROM venues WHERE owner_id = ? ORDER BY name').all(user.id);
}

export function updateVenueSettings(db, { venueId, user, settings }) {
  const venue = getVenue(db, venueId);
  if (!venue) throw new BookingError('not_found');
  if (!canManageVenue(user, venue)) throw new BookingError('forbidden');
  const s = {
    open_hour: Number(settings.open_hour),
    close_hour: Number(settings.close_hour),
    day_price: Number(settings.day_price),
    evening_price: Number(settings.evening_price),
    evening_start_hour: Number(settings.evening_start_hour),
  };
  const intIn = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  if (
    !intIn(s.open_hour, 0, 23) ||
    !intIn(s.close_hour, 1, 24) ||
    s.open_hour >= s.close_hour ||
    !intIn(s.evening_start_hour, 0, 24) ||
    !intIn(s.day_price, 0, 1_000_000) ||
    !intIn(s.evening_price, 0, 1_000_000)
  ) {
    throw new BookingError('invalid_settings');
  }
  db.prepare(
    `UPDATE venues SET open_hour = ?, close_hour = ?, day_price = ?, evening_price = ?, evening_start_hour = ?
     WHERE id = ?`,
  ).run(s.open_hour, s.close_hour, s.day_price, s.evening_price, s.evening_start_hour, venueId);
  return getVenue(db, venueId);
}

export function bookingLocal(booking) {
  return localParts(booking.start_at);
}
