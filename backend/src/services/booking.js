// Business rules from _docs/plan.md §4. Storage-agnostic: talks only to the repository interface.
import { CATEGORY_IDS } from '../categories.js';
import { fail } from '../errors.js';
import { addDays, HOUR_MS, isValidDate, localParts, localToUtc, todayLocal } from '../time.js';

export const CANCEL_LIMIT_MS = 3 * HOUR_MS;
export const BOOKING_WINDOW_DAYS = 13;

export const slotPrice = (venue, hour) => (hour >= venue.eveningStartHour ? venue.eveningPrice : venue.dayPrice);
export const canManageVenue = (user, venue) => Boolean(user && venue && (user.role === 'admin' || venue.ownerId === user.id));

const iso = (ms) => new Date(ms).toISOString();

function venueSummary(v) {
  return {
    id: v.id,
    category: v.category,
    name: v.name,
    address: v.address,
    description: v.description ?? null,
    openHour: v.openHour,
    closeHour: v.closeHour,
    dayPrice: v.dayPrice,
    eveningPrice: v.eveningPrice,
    eveningStartHour: v.eveningStartHour,
    resourceCount: v.resourceCount ?? 0,
  };
}

const resourceDto = (r) => ({ id: r.id, venueId: r.venueId, name: r.name, capacity: r.capacity });

export function createBookingService(repo, { now = Date.now } = {}) {
  const getVenueOr404 = async (id) => (await repo.getVenue(id)) ?? fail('not_found', 404);
  const withCount = async (venue) => ({ ...venue, resourceCount: (await repo.listResources(venue.id)).length });

  async function bookingDto(b) {
    const resource = await repo.getResource(b.resourceId);
    const venue = await repo.getVenue(resource.venueId);
    const { date, hour } = localParts(b.startAt);
    return {
      id: b.id,
      resourceId: resource.id,
      resourceName: resource.name,
      venueId: venue.id,
      venueName: venue.name,
      venueAddress: venue.address,
      category: venue.category,
      startAt: iso(b.startAt),
      date,
      hour,
      price: b.price,
      status: b.status,
      createdAt: iso(b.createdAt),
    };
  }

  function dates(requested) {
    const today = todayLocal(now());
    const maxDate = addDays(today, BOOKING_WINDOW_DAYS);
    const date = isValidDate(requested) && requested >= today && requested <= maxDate ? requested : today;
    return { date, today, maxDate };
  }

  async function schedule(venue, requested, { userId = null, forOwner = false } = {}) {
    const { date, today, maxDate } = dates(requested);
    const from = localToUtc(date, venue.openHour);
    const to = localToUtc(date, venue.closeHour);
    const resources = [];
    for (const resource of await repo.listResources(venue.id)) {
      const bookings = await repo.listActiveBookings(resource.id, from, to);
      const blocks = await repo.listBlocks(resource.id, from, to);
      const customers = new Map();
      if (forOwner) {
        for (const b of bookings) if (!customers.has(b.userId)) customers.set(b.userId, await repo.findUserById(b.userId));
      }
      const slots = [];
      for (let hour = venue.openHour; hour < venue.closeHour; hour++) {
        const startAt = localToUtc(date, hour);
        const inSlot = bookings.filter((b) => b.startAt === startAt);
        const block = blocks.find((b) => b.startAt === startAt) ?? null;
        const left = Math.max(resource.capacity - inSlot.length, 0);
        let status = 'free';
        if (startAt <= now()) status = 'past';
        else if (block) status = 'blocked';
        else if (left === 0) status = 'full';
        const slot = {
          hour,
          startAt: iso(startAt),
          price: slotPrice(venue, hour),
          status,
          left,
          mine: userId != null && inSlot.some((b) => b.userId === userId),
          blockId: block?.id ?? null,
        };
        if (forOwner) {
          slot.bookings = inSlot.map((b) => ({
            id: b.id,
            status: b.status,
            customerName: customers.get(b.userId)?.name ?? null,
            customerPhone: customers.get(b.userId)?.phone ?? '',
          }));
        }
        slots.push(slot);
      }
      resources.push({ resource: resourceDto(resource), slots });
    }
    return { venueId: venue.id, date, today, maxDate, resources };
  }

  async function resolveSlot({ resourceId, date, hour }) {
    const resource = (await repo.getResource(Number(resourceId))) ?? fail('not_found', 404);
    const venue = await repo.getVenue(resource.venueId);
    const h = Number(hour);
    if (!isValidDate(date) || !Number.isInteger(h) || h < venue.openHour || h >= venue.closeHour) fail('invalid_slot', 400);
    return { resource, venue, hour: h, startAt: localToUtc(date, h) };
  }

  async function bookingContext(bookingId) {
    const booking = (await repo.getBooking(Number(bookingId))) ?? fail('not_found', 404);
    const resource = await repo.getResource(booking.resourceId);
    const venue = await repo.getVenue(resource.venueId);
    return { booking, venue };
  }

  return {
    async categoryCounts() {
      const venues = await repo.listVenues();
      return CATEGORY_IDS.map((id) => ({ id, venueCount: venues.filter((v) => v.category === id).length }));
    },

    async listVenues({ category = null, q = '' } = {}) {
      if (category && !CATEGORY_IDS.includes(category)) fail('validation_error', 400);
      const query = String(q).trim().toLocaleLowerCase();
      return (await repo.listVenues())
        .filter((v) => !category || v.category === category)
        .filter((v) => !query || `${v.name} ${v.address} ${v.description ?? ''}`.toLocaleLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(venueSummary);
    },

    async getVenue(id) {
      const venue = await getVenueOr404(Number(id));
      const resources = await repo.listResources(venue.id);
      return { ...venueSummary({ ...venue, resourceCount: resources.length }), resources: resources.map(resourceDto) };
    },

    async publicSchedule(venueId, date, user) {
      return schedule(await getVenueOr404(Number(venueId)), date, { userId: user?.id ?? null });
    },

    async createBooking(user, slotRef) {
      const { resource, venue, hour, startAt } = await resolveSlot(slotRef);
      if (startAt <= now()) fail('past_slot', 400);
      if (await repo.findBlock(resource.id, startAt)) fail('blocked_slot', 409);
      const booking = await repo.insertBookingWithinCapacity(
        { resourceId: resource.id, userId: user.id, startAt, price: slotPrice(venue, hour), createdAt: now() },
        resource.capacity,
      );
      return bookingDto(booking);
    },

    async myBookings(user) {
      return Promise.all((await repo.listBookingsByUser(user.id)).map(bookingDto));
    },

    /** Customers may cancel until 3 hours before start; venue owners and admins at any time. */
    async cancelBooking(user, bookingId) {
      const { booking, venue } = await bookingContext(bookingId);
      const manager = canManageVenue(user, venue);
      if (booking.userId !== user.id && !manager) fail('forbidden', 403);
      if (booking.status === 'cancelled') fail('already_cancelled', 409);
      if (!manager && booking.startAt - now() < CANCEL_LIMIT_MS) fail('too_late', 409);
      return bookingDto(await repo.updateBooking(booking.id, { status: 'cancelled', cancelledBy: user.id }));
    },

    async ownerVenues(user) {
      if (user.role === 'player') fail('forbidden', 403);
      const venues = (await repo.listVenues()).filter((v) => canManageVenue(user, v));
      return venues.sort((a, b) => a.name.localeCompare(b.name)).map(venueSummary);
    },

    async ownerSchedule(user, venueId, date) {
      const venue = await getVenueOr404(Number(venueId));
      if (!canManageVenue(user, venue)) fail('forbidden', 403);
      return schedule(venue, date, { forOwner: true });
    },

    async confirmBooking(user, bookingId) {
      const { booking, venue } = await bookingContext(bookingId);
      if (!canManageVenue(user, venue)) fail('forbidden', 403);
      if (booking.status !== 'pending') fail('invalid_status', 409);
      return bookingDto(await repo.updateBooking(booking.id, { status: 'confirmed' }));
    },

    async blockSlot(user, slotRef) {
      const { resource, venue, startAt } = await resolveSlot(slotRef);
      if (!canManageVenue(user, venue)) fail('forbidden', 403);
      if (await repo.hasActiveBooking(resource.id, startAt)) fail('taken', 409);
      if (await repo.findBlock(resource.id, startAt)) fail('blocked_slot', 409);
      const block = await repo.createBlock({ resourceId: resource.id, startAt });
      return { id: block.id, resourceId: block.resourceId, startAt: iso(block.startAt) };
    },

    async unblockSlot(user, blockId) {
      const block = (await repo.getBlock(Number(blockId))) ?? fail('not_found', 404);
      const resource = await repo.getResource(block.resourceId);
      if (!canManageVenue(user, await repo.getVenue(resource.venueId))) fail('forbidden', 403);
      await repo.deleteBlock(block.id);
    },

    async updateVenueSettings(user, venueId, settings) {
      const venue = await getVenueOr404(Number(venueId));
      if (!canManageVenue(user, venue)) fail('forbidden', 403);
      const s = {
        openHour: Number(settings?.openHour),
        closeHour: Number(settings?.closeHour),
        dayPrice: Number(settings?.dayPrice),
        eveningPrice: Number(settings?.eveningPrice),
        eveningStartHour: Number(settings?.eveningStartHour),
      };
      const intIn = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
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
      // Active future bookings must stay inside the new opening hours (#41).
      for (const resource of await repo.listResources(venue.id)) {
        for (const b of await repo.listActiveBookings(resource.id, now() + 1, Number.MAX_SAFE_INTEGER)) {
          const { hour } = localParts(b.startAt);
          if (hour < s.openHour || hour >= s.closeHour) fail('hours_conflict', 409);
        }
      }
      return venueSummary(await withCount(await repo.updateVenue(venue.id, s)));
    },
  };
}
