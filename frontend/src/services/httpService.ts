// BookingApi over the real REST API described in /openapi.yml.
import type { BookingApi, VenueFilter } from './api';
import { ApiError, type ErrorCode } from './types';

export function createHttpService(baseUrl = '/api/v1', fetchImpl: typeof fetch = (...a) => fetch(...a)): BookingApi {
  let token: string | null = null;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(baseUrl + path, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('network', 0);
    }
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const code = (data?.error?.code as ErrorCode | undefined) ?? (res.status >= 500 ? 'server_error' : 'validation_error');
      throw new ApiError(code, res.status, data?.error?.message);
    }
    return data as T;
  }

  const qs = (params: Record<string, string | undefined | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return {
    setToken: (next) => {
      token = next;
    },
    listCategories: () => request('GET', '/categories'),
    listVenues: (f: VenueFilter = {}) => request('GET', `/venues${qs({ category: f.category, q: f.q })}`),
    getVenue: (id) => request('GET', `/venues/${id}`),
    getSchedule: (venueId, date) => request('GET', `/venues/${venueId}/schedule${qs({ date })}`),
    requestCode: (phone) => request('POST', '/auth/code', { phone }),
    verifyCode: (phone, code, name) => request('POST', '/auth/verify', { phone, code, ...(name ? { name } : {}) }),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/me'),
    updateMe: (patch) => request('PATCH', '/me', patch),
    createBooking: (slot) => request('POST', '/bookings', slot),
    myBookings: () => request('GET', '/me/bookings'),
    cancelBooking: (id) => request('POST', `/bookings/${id}/cancel`),
    ownerVenues: () => request('GET', '/owner/venues'),
    ownerSchedule: (venueId, date) => request('GET', `/owner/venues/${venueId}/schedule${qs({ date })}`),
    confirmBooking: (id) => request('POST', `/owner/bookings/${id}/confirm`),
    blockSlot: (slot) => request('POST', '/owner/blocks', slot),
    unblockSlot: (blockId) => request('DELETE', `/owner/blocks/${blockId}`),
    updateVenueSettings: (venueId, settings) => request('PATCH', `/owner/venues/${venueId}`, settings),
  };
}
