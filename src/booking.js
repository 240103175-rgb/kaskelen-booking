// Business rules from _docs/plan.md §4.
import { CATEGORY_IDS } from './categories.js';
import { isSlotFull, isUniqueViolation } from './db.js';
import { HOUR_MS, isValidDate, localToUtc } from './time.js';

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

/** Venues with resource count, optionally filtered by category and a free-text query. */
export function listVenues(db, { category = null, query = '' } = {}) {
  const venues = db
    .prepare(
      `SELECT v.*, COUNT(r.id) AS resource_count
       FROM venues v LEFT JOIN resources r ON r.venue_id = v.id
       WHERE (? IS NULL OR v.category = ?)
       GROUP BY v.id ORDER BY v.name`,
    )
    .all(category, category);
  const q = query.trim().toLocaleLowerCase();
  if (!q) return venues;
  return venues.filter((v) => `${v.name} ${v.address} ${v.description ?? ''}`.toLocaleLowerCase().includes(q));
}

export function categoryCounts(db) {
  const rows = db.prepare('SELECT category, COUNT(*) AS n FROM venues GROUP BY category').all();
  const counts = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0]));
  for (const row of rows) counts[row.category] = row.n;
  return counts;
}

export function listResources(db, venueId) {
  return db.prepare('SELECT * FROM resources WHERE venue_id = ? ORDER BY id').all(venueId);
}

function getResourceWithVenue(db, resourceId) {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);
  if (!resource) return null;
  return { resource, venue: getVenue(db, resource.venue_id) };
}

export function canManageVenue(user, venue) {
  return Boolean(user && venue && (user.role === 'admin' || venue.owner_id === user.id));
}

/**
 * Slots of one resource for one local date.
 * status: free | full | blocked | past; `mine` is true when `userId` holds a booking in the slot.
 */
export function getSchedule(db, resourceId, date, now, userId = null) {
  const found = getResourceWithVenue(db, resourceId);
  if (!found || !isValidDate(date)) return [];
  const { venue, resource } = found;
  const from = localToUtc(date, venue.open_hour);
  const to = localToUtc(date, venue.close_hour);

  const bookingsBySlot = new Map();
  const rows = db
    .prepare(
      `SELECT b.*, u.name AS user_name, u.phone AS user_phone
       FROM bookings b JOIN users u ON u.id = b.user_id
       WHERE b.resource_id = ? AND b.start_at >= ? AND b.start_at < ? AND b.status <> 'cancelled'
       ORDER BY b.created_at`,
    )
    .all(resourceId, from, to);
  for (const b of rows) {
    if (!bookingsBySlot.has(b.start_at)) bookingsBySlot.set(b.start_at, []);
    bookingsBySlot.get(b.start_at).push(b);
  }
  const blocks = new Map(
    db
      .prepare('SELECT * FROM blocks WHERE resource_id = ? AND start_at >= ? AND start_at < ?')
      .all(resourceId, from, to)
      .map((b) => [b.start_at, b]),
  );

  const slots = [];
  for (let hour = venue.open_hour; hour < venue.close_hour; hour++) {
    const startAt = localToUtc(date, hour);
    const bookings = bookingsBySlot.get(startAt) ?? [];
    const block = blocks.get(startAt) ?? null;
    const left = resource.capacity - bookings.length;
    let status = 'free';
    if (startAt <= now) status = 'past';
    else if (block) status = 'blocked';
    else if (left <= 0) status = 'full';
    slots.push({
      hour,
      startAt,
      price: slotPrice(venue, hour),
      status,
      left: Math.max(left, 0),
      bookings,
      block,
      mine: userId != null && bookings.some((b) => b.user_id === userId),
    });
  }
  return slots;
}

function resolveSlot(db, resourceId, date, hour) {
  const found = getResourceWithVenue(db, resourceId);
  if (!found) throw new BookingError('not_found');
  const h = Number(hour);
  if (!isValidDate(date) || !Number.isInteger(h) || h < found.venue.open_hour || h >= found.venue.close_hour) {
    throw new BookingError('invalid_slot');
  }
  return { ...found, hour: h, startAt: localToUtc(date, h) };
}

export function createBooking(db, { resourceId, userId, date, hour, now }) {
  const { venue, hour: h, startAt } = resolveSlot(db, resourceId, date, hour);
  if (startAt <= now) throw new BookingError('past_slot');
  if (db.prepare('SELECT 1 FROM blocks WHERE resource_id = ? AND start_at = ?').get(resourceId, startAt)) {
    throw new BookingError('blocked_slot');
  }
  try {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO bookings (resource_id, user_id, start_at, price, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(resourceId, userId, startAt, slotPrice(venue, h), now);
    return getBooking(db, Number(lastInsertRowid));
  } catch (err) {
    if (isSlotFull(err)) throw new BookingError('taken');
    if (isUniqueViolation(err)) throw new BookingError('already_booked');
    throw err;
  }
}

const BOOKING_SELECT = `
  SELECT b.*, r.name AS resource_name, r.venue_id, v.name AS venue_name, v.address AS venue_address,
         v.category, v.owner_id, u.name AS user_name, u.phone AS user_phone
  FROM bookings b
  JOIN resources r ON r.id = b.resource_id
  JOIN venues v ON v.id = r.venue_id
  JOIN users u ON u.id = b.user_id`;

export function getBooking(db, bookingId) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(bookingId);
}

export function userBookings(db, userId) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.start_at DESC`).all(userId);
}

/** Customers may cancel until 3 hours before start; venue owners and admins at any time. */
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

export function blockSlot(db, { resourceId, date, hour, user, reason = null }) {
  const { venue, startAt } = resolveSlot(db, resourceId, date, hour);
  if (!canManageVenue(user, venue)) throw new BookingError('forbidden');
  if (db.prepare("SELECT 1 FROM bookings WHERE resource_id = ? AND start_at = ? AND status <> 'cancelled'").get(resourceId, startAt)) {
    throw new BookingError('taken');
  }
  try {
    db.prepare('INSERT INTO blocks (resource_id, start_at, reason) VALUES (?, ?, ?)').run(resourceId, startAt, reason);
  } catch (err) {
    if (isUniqueViolation(err)) throw new BookingError('blocked_slot');
    throw err;
  }
}

export function unblockSlot(db, { blockId, user }) {
  const block = db.prepare('SELECT * FROM blocks WHERE id = ?').get(blockId);
  if (!block) throw new BookingError('not_found');
  const { venue } = getResourceWithVenue(db, block.resource_id);
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
