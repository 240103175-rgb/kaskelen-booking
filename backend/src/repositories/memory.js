// In-memory repository. Same interface as repositories/sql.js; data is lost on restart.
// Every method is async so services do not care which storage is behind them.
import { AppError } from '../errors.js';

const clone = (row) => (row ? structuredClone(row) : null);

export function createMemoryRepository() {
  let nextId = 1;
  const t = { users: [], codes: new Map(), sessions: new Map(), venues: [], resources: [], bookings: [], blocks: [] };
  const active = (b) => b.status !== 'cancelled';

  return {
    kind: 'memory',
    async close() {},

    // users
    async findUserByPhone(phone) {
      return clone(t.users.find((u) => u.phone === phone));
    },
    async findUserById(id) {
      return clone(t.users.find((u) => u.id === id));
    },
    async createUser(user) {
      if (t.users.some((u) => u.phone === user.phone)) throw new Error('UNIQUE constraint failed: users.phone');
      const row = { id: nextId++, name: null, role: 'player', lang: 'kk', ...user };
      t.users.push(row);
      return clone(row);
    },
    async updateUser(id, patch) {
      const row = t.users.find((u) => u.id === id);
      Object.assign(row, patch);
      return clone(row);
    },

    // login codes
    async getCode(phone) {
      return clone(t.codes.get(phone));
    },
    async saveCode(code) {
      t.codes.set(code.phone, { ...code });
    },
    async incrementCodeAttempts(phone) {
      const row = t.codes.get(phone);
      if (row) row.attempts += 1;
    },
    async deleteCode(phone) {
      t.codes.delete(phone);
    },

    // sessions
    async createSession(session) {
      t.sessions.set(session.token, { ...session });
    },
    async findSessionUser(token, now) {
      const s = t.sessions.get(token);
      if (!s || s.expiresAt <= now) return null;
      return clone(t.users.find((u) => u.id === s.userId));
    },
    async deleteSession(token) {
      t.sessions.delete(token);
    },

    // venues and resources
    async countVenues() {
      return t.venues.length;
    },
    async listVenues() {
      return t.venues.map((v) => ({ ...v, resourceCount: t.resources.filter((r) => r.venueId === v.id).length }));
    },
    async getVenue(id) {
      return clone(t.venues.find((v) => v.id === id));
    },
    async createVenue(venue) {
      const row = { id: nextId++, description: null, ...venue };
      t.venues.push(row);
      return clone(row);
    },
    async updateVenue(id, patch) {
      const row = t.venues.find((v) => v.id === id);
      Object.assign(row, patch);
      return clone(row);
    },
    async createResource(resource) {
      if (!t.venues.some((v) => v.id === resource.venueId)) throw new Error('FOREIGN KEY constraint failed');
      const row = { id: nextId++, ...resource };
      t.resources.push(row);
      return clone(row);
    },
    async listResources(venueId) {
      return t.resources.filter((r) => r.venueId === venueId).map(clone);
    },
    async getResource(id) {
      return clone(t.resources.find((r) => r.id === id));
    },

    // bookings
    /** Inserts unless the slot is full or the user already holds a place in it. */
    async insertBookingWithinCapacity(booking, capacity) {
      const inSlot = t.bookings.filter((b) => b.resourceId === booking.resourceId && b.startAt === booking.startAt && active(b));
      if (inSlot.some((b) => b.userId === booking.userId)) throw new AppError('already_booked', 409);
      if (inSlot.length >= capacity) throw new AppError('taken', 409);
      const row = { id: nextId++, status: 'pending', cancelledBy: null, ...booking };
      t.bookings.push(row);
      return clone(row);
    },
    async getBooking(id) {
      return clone(t.bookings.find((b) => b.id === id));
    },
    async updateBooking(id, patch) {
      const row = t.bookings.find((b) => b.id === id);
      Object.assign(row, patch);
      return clone(row);
    },
    async listActiveBookings(resourceId, from, to) {
      return t.bookings
        .filter((b) => b.resourceId === resourceId && b.startAt >= from && b.startAt < to && active(b))
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(clone);
    },
    async hasActiveBooking(resourceId, startAt) {
      return t.bookings.some((b) => b.resourceId === resourceId && b.startAt === startAt && active(b));
    },
    async listBookingsByUser(userId) {
      return t.bookings
        .filter((b) => b.userId === userId)
        .sort((a, b) => b.startAt - a.startAt)
        .map(clone);
    },

    // blocks
    async listBlocks(resourceId, from, to) {
      return t.blocks.filter((b) => b.resourceId === resourceId && b.startAt >= from && b.startAt < to).map(clone);
    },
    async findBlock(resourceId, startAt) {
      return clone(t.blocks.find((b) => b.resourceId === resourceId && b.startAt === startAt));
    },
    async createBlock(block) {
      if (t.blocks.some((b) => b.resourceId === block.resourceId && b.startAt === block.startAt)) throw new AppError('blocked_slot', 409);
      const row = { id: nextId++, ...block };
      t.blocks.push(row);
      return clone(row);
    },
    async getBlock(id) {
      return clone(t.blocks.find((b) => b.id === id));
    },
    async deleteBlock(id) {
      t.blocks = t.blocks.filter((b) => b.id !== id);
    },
  };
}
