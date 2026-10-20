// In-browser implementation of BookingApi on synthetic data.
// It applies the same business rules as the backend (_docs/plan.md §4) so the UI
// can be built and tested before the API exists.
import { addDays, HOUR_MS, isValidDate, localParts, localToUtc, todayLocal } from '../lib/time';
import type { BookingApi, VenueFilter } from './api';
import { DEMO_OWNER_PHONE, SEED_VENUES } from './mockData';
import {
  ApiError,
  type Block,
  type Booking,
  type BookingStatus,
  type CategoryCount,
  type CodeRequest,
  type ErrorCode,
  type Lang,
  type Resource,
  type Schedule,
  type Session,
  type Slot,
  type SlotRef,
  type User,
  type Venue,
  type VenueSettings,
  type VenueSummary,
} from './types';
import { CATEGORY_IDS } from '../lib/categories';

export const BOOKING_WINDOW_DAYS = 13;
export const CANCEL_LIMIT_MS = 3 * HOUR_MS;
const CODE_TTL_MS = 5 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

interface MockVenue extends Omit<VenueSummary, 'resourceCount'> {
  ownerId: number;
}
interface MockBooking {
  id: number;
  resourceId: number;
  userId: number;
  startAt: number;
  price: number;
  status: BookingStatus;
  cancelledBy: number | null;
  createdAt: number;
}
interface MockBlock {
  id: number;
  resourceId: number;
  startAt: number;
}

export interface MockOptions {
  /** Simulated network latency in ms (0 in tests). */
  latency?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
  /** Show the login code in the response, like the dev backend. */
  devCodes?: boolean;
}

const fail = (code: ErrorCode, status: number): never => {
  throw new ApiError(code, status);
};

export function createMockService(options: MockOptions = {}): BookingApi & {
  /** Test hook: make the next call fail with this error. */
  failNext(code: ErrorCode, status?: number): void;
  /** Test hook: the last login code issued per phone. */
  lastCode(phone: string): string | undefined;
} {
  const latency = options.latency ?? 250;
  const now = options.now ?? Date.now;
  const devCodes = options.devCodes ?? true;
  let nextId = 1;
  const id = () => nextId++;

  const users: User[] = [{ id: id(), phone: DEMO_OWNER_PHONE, name: 'Ерлан', role: 'owner', lang: 'kk' }];
  const venues: MockVenue[] = [];
  const resources: Resource[] = [];
  for (const [category, name, address, description, open, close, day, evening, eveningStart, res] of SEED_VENUES) {
    const venue: MockVenue = {
      id: id(),
      category,
      name,
      address,
      description,
      openHour: open,
      closeHour: close,
      dayPrice: day,
      eveningPrice: evening,
      eveningStartHour: eveningStart,
      ownerId: users[0].id,
    };
    venues.push(venue);
    for (const [resourceName, capacity] of res) resources.push({ id: id(), venueId: venue.id, name: resourceName, capacity });
  }
  const bookings: MockBooking[] = [];
  const blocks: MockBlock[] = [];
  const codes = new Map<string, { code: string; expiresAt: number; createdAt: number; attempts: number }>();
  const sessions = new Map<string, number>();
  let token: string | null = null;
  let pendingFailure: ApiError | null = null;

  async function call<T>(fn: () => T): Promise<T> {
    if (latency) await new Promise((r) => setTimeout(r, latency));
    if (pendingFailure) {
      const err = pendingFailure;
      pendingFailure = null;
      throw err;
    }
    return structuredClone(fn());
  }

  const summary = (v: MockVenue): VenueSummary => {
    const { ownerId: _owner, ...rest } = v;
    return { ...rest, resourceCount: resources.filter((r) => r.venueId === v.id).length };
  };
  const venueById = (venueId: number) => venues.find((v) => v.id === venueId) ?? fail('not_found', 404);
  const currentUser = (): User => {
    const userId = token ? sessions.get(token) : undefined;
    return users.find((u) => u.id === userId) ?? fail('unauthorized', 401);
  };
  const canManage = (user: User, venue: MockVenue) => user.role === 'admin' || venue.ownerId === user.id;
  const price = (venue: MockVenue, hour: number) => (hour >= venue.eveningStartHour ? venue.eveningPrice : venue.dayPrice);
  const active = (b: MockBooking) => b.status !== 'cancelled';

  function toBooking(b: MockBooking): Booking {
    const resource = resources.find((r) => r.id === b.resourceId)!;
    const venue = venueById(resource.venueId);
    const { date, hour } = localParts(b.startAt);
    return {
      id: b.id,
      resourceId: resource.id,
      resourceName: resource.name,
      venueId: venue.id,
      venueName: venue.name,
      venueAddress: venue.address,
      category: venue.category,
      startAt: new Date(b.startAt).toISOString(),
      date,
      hour,
      price: b.price,
      status: b.status,
      createdAt: new Date(b.createdAt).toISOString(),
    };
  }

  function dates(requested?: string) {
    const today = todayLocal(now());
    const maxDate = addDays(today, BOOKING_WINDOW_DAYS);
    const date = isValidDate(requested) && requested >= today && requested <= maxDate ? requested : today;
    return { date, today, maxDate };
  }

  function schedule(venue: MockVenue, requested: string | undefined, forOwner: boolean, userId: number | null): Schedule {
    const { date, today, maxDate } = dates(requested);
    return {
      venueId: venue.id,
      date,
      today,
      maxDate,
      resources: resources
        .filter((r) => r.venueId === venue.id)
        .map((resource) => ({
          resource,
          slots: Array.from({ length: venue.closeHour - venue.openHour }, (_, i): Slot => {
            const hour = venue.openHour + i;
            const startAt = localToUtc(date, hour);
            const inSlot = bookings.filter((b) => b.resourceId === resource.id && b.startAt === startAt && active(b));
            const block = blocks.find((b) => b.resourceId === resource.id && b.startAt === startAt) ?? null;
            const left = Math.max(resource.capacity - inSlot.length, 0);
            let status: Slot['status'] = 'free';
            if (startAt <= now()) status = 'past';
            else if (block) status = 'blocked';
            else if (left === 0) status = 'full';
            const slot: Slot = {
              hour,
              startAt: new Date(startAt).toISOString(),
              price: price(venue, hour),
              status,
              left,
              mine: userId != null && inSlot.some((b) => b.userId === userId),
              blockId: block?.id ?? null,
            };
            if (forOwner) {
              slot.bookings = inSlot.map((b) => {
                const customer = users.find((u) => u.id === b.userId)!;
                return { id: b.id, status: b.status, customerName: customer.name, customerPhone: customer.phone };
              });
            }
            return slot;
          }),
        })),
    };
  }

  function resolveSlot(ref: SlotRef) {
    const resource = resources.find((r) => r.id === ref.resourceId) ?? fail('not_found', 404);
    const venue = venueById(resource.venueId);
    const hour = Number(ref.hour);
    if (!isValidDate(ref.date) || !Number.isInteger(hour) || hour < venue.openHour || hour >= venue.closeHour) {
      fail('invalid_slot', 400);
    }
    return { resource, venue, hour, startAt: localToUtc(ref.date, hour) };
  }

  function normalizePhone(input: string): string | null {
    let digits = String(input ?? '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
    return /^77\d{9}$/.test(digits) ? `+${digits}` : null;
  }

  return {
    failNext(code, status = 500) {
      pendingFailure = new ApiError(code, status);
    },
    lastCode(phone) {
      return codes.get(normalizePhone(phone) ?? '')?.code;
    },
    setToken(next) {
      token = next;
    },

    listCategories: () =>
      call((): CategoryCount[] => CATEGORY_IDS.map((c) => ({ id: c, venueCount: venues.filter((v) => v.category === c).length }))),

    listVenues: (filter: VenueFilter = {}) =>
      call(() => {
        const q = (filter.q ?? '').trim().toLocaleLowerCase();
        return venues
          .filter((v) => !filter.category || v.category === filter.category)
          .filter((v) => !q || `${v.name} ${v.address} ${v.description ?? ''}`.toLocaleLowerCase().includes(q))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(summary);
      }),

    getVenue: (venueId) =>
      call((): Venue => {
        const v = venueById(venueId);
        return { ...summary(v), resources: resources.filter((r) => r.venueId === v.id) };
      }),

    getSchedule: (venueId, date) =>
      call(() => {
        const userId = token ? (sessions.get(token) ?? null) : null;
        return schedule(venueById(venueId), date, false, userId);
      }),

    requestCode: (phoneInput) =>
      call((): CodeRequest => {
        const phone = normalizePhone(phoneInput) ?? fail('invalid_phone', 400);
        const existing = codes.get(phone);
        if (existing && now() - existing.createdAt < CODE_RESEND_MS) fail('too_soon', 429);
        const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
        codes.set(phone, { code, expiresAt: now() + CODE_TTL_MS, createdAt: now(), attempts: 0 });
        return { phone, expiresInSeconds: CODE_TTL_MS / 1000, ...(devCodes ? { devCode: code } : {}) };
      }),

    verifyCode: (phoneInput, code, name) =>
      call((): Session => {
        const phone = normalizePhone(phoneInput) ?? fail('invalid_phone', 400);
        const row = codes.get(phone);
        if (!row || row.expiresAt < now()) fail('wrong_code', 400);
        if (row!.attempts >= MAX_ATTEMPTS) fail('too_many_attempts', 429);
        if (String(code).trim() !== row!.code) {
          row!.attempts++;
          fail('wrong_code', 400);
        }
        codes.delete(phone);
        let user = users.find((u) => u.phone === phone);
        if (!user) {
          user = { id: id(), phone, name: null, role: 'player', lang: 'kk' };
          users.push(user);
        }
        const trimmed = (name ?? '').trim().slice(0, 60);
        if (trimmed && !user.name) user.name = trimmed;
        const newToken = `mock-${crypto.randomUUID()}`;
        sessions.set(newToken, user.id);
        return { token: newToken, user };
      }),

    logout: () =>
      call(() => {
        if (token) sessions.delete(token);
      }),

    me: () => call(() => currentUser()),

    updateMe: (patch) =>
      call(() => {
        const user = currentUser();
        if (patch.lang) user.lang = patch.lang as Lang;
        if (patch.name !== undefined) user.name = patch.name.trim().slice(0, 60) || null;
        return user;
      }),

    createBooking: (ref) =>
      call(() => {
        const user = currentUser();
        const { resource, venue, hour, startAt } = resolveSlot(ref);
        if (startAt <= now()) fail('past_slot', 400);
        if (blocks.some((b) => b.resourceId === resource.id && b.startAt === startAt)) fail('blocked_slot', 409);
        const inSlot = bookings.filter((b) => b.resourceId === resource.id && b.startAt === startAt && active(b));
        if (inSlot.some((b) => b.userId === user.id)) fail('already_booked', 409);
        if (inSlot.length >= resource.capacity) fail('taken', 409);
        const booking: MockBooking = {
          id: id(),
          resourceId: resource.id,
          userId: user.id,
          startAt,
          price: price(venue, hour),
          status: 'pending',
          cancelledBy: null,
          createdAt: now(),
        };
        bookings.push(booking);
        return toBooking(booking);
      }),

    myBookings: () =>
      call(() => {
        const user = currentUser();
        return bookings
          .filter((b) => b.userId === user.id)
          .sort((a, b) => b.startAt - a.startAt)
          .map(toBooking);
      }),

    cancelBooking: (bookingId) =>
      call(() => {
        const user = currentUser();
        const booking = bookings.find((b) => b.id === bookingId) ?? fail('not_found', 404);
        const resource = resources.find((r) => r.id === booking.resourceId)!;
        const manager = canManage(user, venueById(resource.venueId));
        if (booking.userId !== user.id && !manager) fail('forbidden', 403);
        if (booking.status === 'cancelled') fail('already_cancelled', 409);
        if (!manager && booking.startAt - now() < CANCEL_LIMIT_MS) fail('too_late', 409);
        booking.status = 'cancelled';
        booking.cancelledBy = user.id;
        return toBooking(booking);
      }),

    ownerVenues: () =>
      call(() => {
        const user = currentUser();
        if (user.role === 'player') fail('forbidden', 403);
        return venues
          .filter((v) => canManage(user, v))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(summary);
      }),

    ownerSchedule: (venueId, date) =>
      call(() => {
        const user = currentUser();
        const venue = venueById(venueId);
        if (!canManage(user, venue)) fail('forbidden', 403);
        return schedule(venue, date, true, null);
      }),

    confirmBooking: (bookingId) =>
      call(() => {
        const user = currentUser();
        const booking = bookings.find((b) => b.id === bookingId) ?? fail('not_found', 404);
        const resource = resources.find((r) => r.id === booking.resourceId)!;
        if (!canManage(user, venueById(resource.venueId))) fail('forbidden', 403);
        if (booking.status !== 'pending') fail('invalid_status', 409);
        booking.status = 'confirmed';
        return toBooking(booking);
      }),

    blockSlot: (ref) =>
      call((): Block => {
        const user = currentUser();
        const { resource, venue, startAt } = resolveSlot(ref);
        if (!canManage(user, venue)) fail('forbidden', 403);
        if (bookings.some((b) => b.resourceId === resource.id && b.startAt === startAt && active(b))) fail('taken', 409);
        if (blocks.some((b) => b.resourceId === resource.id && b.startAt === startAt)) fail('blocked_slot', 409);
        const block = { id: id(), resourceId: resource.id, startAt };
        blocks.push(block);
        return { ...block, startAt: new Date(startAt).toISOString() };
      }),

    unblockSlot: (blockId) =>
      call(() => {
        const user = currentUser();
        const index = blocks.findIndex((b) => b.id === blockId);
        if (index < 0) fail('not_found', 404);
        const resource = resources.find((r) => r.id === blocks[index].resourceId)!;
        if (!canManage(user, venueById(resource.venueId))) fail('forbidden', 403);
        blocks.splice(index, 1);
      }),

    updateVenueSettings: (venueId, s: VenueSettings) =>
      call(() => {
        const user = currentUser();
        const venue = venueById(venueId);
        if (!canManage(user, venue)) fail('forbidden', 403);
        const intIn = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
        if (
          !intIn(s.openHour, 0, 23) ||
          !intIn(s.closeHour, 1, 24) ||
          s.openHour >= s.closeHour ||
          !intIn(s.eveningStartHour, 0, 24) ||
          !intIn(s.dayPrice, 0, 1_000_000) ||
          !intIn(s.eveningPrice, 0, 1_000_000)
        ) {
          fail('invalid_settings', 400);
        }
        const venueResources = resources.filter((r) => r.venueId === venue.id).map((r) => r.id);
        for (const b of bookings) {
          if (!venueResources.includes(b.resourceId) || !active(b) || b.startAt <= now()) continue;
          const { hour } = localParts(b.startAt);
          if (hour < s.openHour || hour >= s.closeHour) fail('hours_conflict', 409);
        }
        Object.assign(venue, s);
        return summary(venue);
      }),
  };
}
