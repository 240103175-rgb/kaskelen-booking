import { describe, expect, it, vi } from 'vitest';
import { createHttpService } from '../services/httpService';

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('httpService', () => {
  it('sends the bearer token and JSON body', async () => {
    const fetchMock = vi.fn(() => json(201, { id: 1 }));
    const api = createHttpService('/api/v1', fetchMock as unknown as typeof fetch);
    api.setToken('abc');
    await api.createBooking({ resourceId: 3, date: '2026-10-14', hour: 20 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/bookings');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer abc');
    expect(JSON.parse(init.body as string)).toEqual({ resourceId: 3, date: '2026-10-14', hour: 20 });
  });

  it('maps API errors to ApiError codes', async () => {
    const api = createHttpService('/api/v1', (() => json(409, { error: { code: 'taken', message: 'taken' } })) as unknown as typeof fetch);
    await expect(api.createBooking({ resourceId: 1, date: 'x', hour: 1 })).rejects.toMatchObject({ code: 'taken', status: 409 });
  });

  it('maps a dead network to the network code', async () => {
    const api = createHttpService('/api/v1', (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch);
    await expect(api.listCategories()).rejects.toMatchObject({ code: 'network' });
  });

  it('builds query strings only from present filters', async () => {
    const fetchMock = vi.fn(() => json(200, []));
    const api = createHttpService('/api/v1', fetchMock as unknown as typeof fetch);
    await api.listVenues({ category: 'pool', q: '' });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/venues?category=pool');
  });
});
