// HTTP layer: routes, auth, JSON errors. No business rules here — those live in services/.
import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppError } from './errors.js';
import { createAuthService } from './services/auth.js';
import { createBookingService } from './services/booking.js';

/**
 * @param {object} options
 * @param {object} options.repo repository (memory or sql)
 * @param {() => number} [options.now] clock, injectable for tests
 * @param {boolean} [options.devCodes] return the login code in the response (never in production)
 * @param {string} [options.staticDir] built frontend to serve (frontend/dist)
 */
export function createApp({ repo, now = Date.now, devCodes = false, log = console.log, staticDir = null }) {
  const auth = createAuthService(repo, { now, log });
  const booking = createBookingService(repo, { now });
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };
  const bearer = (req) => /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1] ?? null;

  api.use(async (req, _res, next) => {
    try {
      req.token = bearer(req);
      req.user = await auth.userFromToken(req.token);
      next();
    } catch (err) {
      next(err);
    }
  });

  const requireUser = (req, _res, next) => (req.user ? next() : next(new AppError('unauthorized', 401)));

  api.get('/categories', wrap(async (_req, res) => res.json(await booking.categoryCounts())));
  api.get('/venues', wrap(async (req, res) => res.json(await booking.listVenues({ category: req.query.category || null, q: req.query.q ?? '' }))));
  api.get('/venues/:id', wrap(async (req, res) => res.json(await booking.getVenue(req.params.id))));
  api.get('/venues/:id/schedule', wrap(async (req, res) => res.json(await booking.publicSchedule(req.params.id, req.query.date, req.user))));

  api.post(
    '/auth/code',
    wrap(async (req, res) => {
      const { phone, code, expiresInSeconds } = await auth.requestCode(req.body?.phone);
      res.json({ phone, expiresInSeconds, ...(devCodes ? { devCode: code } : {}) });
    }),
  );
  api.post('/auth/verify', wrap(async (req, res) => res.json(await auth.verifyCode(req.body?.phone, req.body?.code, req.body?.name))));
  api.post('/auth/logout', requireUser, wrap(async (req, res) => (await auth.logout(req.token), res.status(204).end())));

  api.get('/me', requireUser, (req, res) => res.json(userDto(req.user)));
  api.patch('/me', requireUser, wrap(async (req, res) => res.json(userDto(await auth.updateMe(req.user, req.body ?? {})))));
  api.get('/me/bookings', requireUser, wrap(async (req, res) => res.json(await booking.myBookings(req.user))));

  api.post('/bookings', requireUser, wrap(async (req, res) => res.status(201).json(await booking.createBooking(req.user, req.body ?? {}))));
  api.post('/bookings/:id/cancel', requireUser, wrap(async (req, res) => res.json(await booking.cancelBooking(req.user, req.params.id))));

  api.get('/owner/venues', requireUser, wrap(async (req, res) => res.json(await booking.ownerVenues(req.user))));
  api.patch('/owner/venues/:id', requireUser, wrap(async (req, res) => res.json(await booking.updateVenueSettings(req.user, req.params.id, req.body))));
  api.get('/owner/venues/:id/schedule', requireUser, wrap(async (req, res) => res.json(await booking.ownerSchedule(req.user, req.params.id, req.query.date))));
  api.post('/owner/bookings/:id/confirm', requireUser, wrap(async (req, res) => res.json(await booking.confirmBooking(req.user, req.params.id))));
  api.post('/owner/blocks', requireUser, wrap(async (req, res) => res.status(201).json(await booking.blockSlot(req.user, req.body ?? {}))));
  api.delete('/owner/blocks/:id', requireUser, wrap(async (req, res) => (await booking.unblockSlot(req.user, req.params.id), res.status(204).end())));

  api.use((_req, _res, next) => next(new AppError('not_found', 404)));

  app.use('/api/v1', api);

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // Single-page app: every other GET returns index.html and the router takes over.
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'validation_error', message: 'Invalid JSON' } });
    console.error(err);
    res.status(500).json({ error: { code: 'server_error', message: 'Internal error' } });
  });

  return app;
}

export function userDto(u) {
  return { id: u.id, phone: u.phone, name: u.name ?? null, role: u.role, lang: u.lang };
}
