import express from 'express';
import { fileURLToPath } from 'node:url';
import { AuthError, endSession, requestCode, SESSION_TTL_MS, userFromSession, verifyCode } from './auth.js';
import {
  blockSlot,
  BookingError,
  cancelBooking,
  confirmBooking,
  createBooking,
  getSchedule,
  getVenue,
  listPitches,
  listVenues,
  ownedVenues,
  unblockSlot,
  updateVenueSettings,
  userBookings,
} from './booking.js';
import { DEFAULT_LANG, hasKey, LANGS, translator } from './i18n.js';
import { addDays, isValidDate, todayLocal } from './time.js';
import * as views from './views.js';

const BOOKING_WINDOW_DAYS = 13;
const SESSION_COOKIE = 'sid';

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([k, v]) => k && v !== undefined)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]),
  );
}

function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function refererPath(req) {
  try {
    const url = new URL(req.get('referer'));
    return safeNext(url.pathname + url.search);
  } catch {
    return '/';
  }
}

function withFlash(url, kind, key) {
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  params.delete('ok');
  params.delete('err');
  params.set(kind, key);
  return `${path}?${params}`;
}

/**
 * @param {object} options
 * @param {import('node:sqlite').DatabaseSync} options.db
 * @param {() => number} [options.now] clock, injectable for tests
 * @param {boolean} [options.showDevCode] show the login code on the page (never in production)
 * @param {(msg: string) => void} [options.log]
 */
export function createApp({ db, now = Date.now, showDevCode = false, log = console.log }) {
  const app = express();
  const secureCookies = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    req.user = userFromSession(db, req.cookies[SESSION_COOKIE], now());
    const lang = LANGS.includes(req.cookies.lang) ? req.cookies.lang : (req.user?.lang ?? DEFAULT_LANG);
    const flash = (kind) => (typeof req.query[kind] === 'string' && hasKey(`${kind}_${req.query[kind]}`) ? req.query[kind] : null);
    req.ctx = { lang, t: translator(lang), user: req.user, path: req.originalUrl, ok: flash('ok'), err: flash('err') };
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    next();
  });

  const requireUser = (req, res, next) => {
    if (!req.user) return res.redirect(`/login?next=${encodeURIComponent(refererPath(req))}`);
    next();
  };
  const requireOwner = (req, res, next) => {
    if (!req.user) return res.redirect('/login?next=/owner');
    if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).send(views.notFoundPage(req.ctx));
    next();
  };

  // Runs an action and redirects back with a translated success or error message.
  const act = (fn) => (req, res) => {
    const back = refererPath(req);
    try {
      const { ok, to } = fn(req);
      res.redirect(withFlash(to ?? back, 'ok', ok));
    } catch (err) {
      if (err instanceof BookingError || err instanceof AuthError) return res.redirect(withFlash(back, 'err', err.code));
      throw err;
    }
  };

  const dateParam = (req) => {
    const today = todayLocal(now());
    const maxDate = addDays(today, BOOKING_WINDOW_DAYS);
    const d = req.query.date;
    const date = isValidDate(d) && d >= today && d <= maxDate ? d : today;
    return { date, today, maxDate };
  };

  app.get('/', (req, res) => {
    res.send(views.homePage(req.ctx, listVenues(db)));
  });

  app.get('/venues/:id', (req, res) => {
    const venue = getVenue(db, Number(req.params.id));
    if (!venue) return res.status(404).send(views.notFoundPage(req.ctx));
    const dates = dateParam(req);
    const pitches = listPitches(db, venue.id).map((p) => ({ ...p, slots: getSchedule(db, p.id, dates.date, now()) }));
    res.send(views.venuePage(req.ctx, { venue, pitches, ...dates }));
  });

  app.post(
    '/bookings',
    requireUser,
    act((req) => {
      const { pitchId, date, hour } = req.body;
      createBooking(db, { pitchId: Number(pitchId), userId: req.user.id, date, hour, now: now() });
      return { ok: 'booked', to: '/me' };
    }),
  );

  app.post(
    '/bookings/:id/cancel',
    requireUser,
    act((req) => {
      cancelBooking(db, { bookingId: Number(req.params.id), user: req.user, now: now() });
      return { ok: 'cancelled' };
    }),
  );

  app.get('/me', (req, res) => {
    if (!req.user) return res.redirect('/login?next=/me');
    res.send(views.myBookingsPage(req.ctx, { bookings: userBookings(db, req.user.id), now: now() }));
  });

  app.get('/login', (req, res) => {
    if (req.user) return res.redirect(safeNext(req.query.next));
    res.send(views.loginPage(req.ctx, { next: safeNext(req.query.next) }));
  });

  app.post('/login', (req, res) => {
    const next = safeNext(req.body.next);
    try {
      const { phone, code } = requestCode(db, req.body.phone, now(), log);
      res.send(views.verifyPage(req.ctx, { next, phone, devCode: showDevCode ? code : null }));
    } catch (err) {
      if (!(err instanceof AuthError)) throw err;
      res.status(400).send(views.loginPage({ ...req.ctx, err: err.code }, { next, phone: req.body.phone }));
    }
  });

  app.post('/login/verify', (req, res) => {
    const next = safeNext(req.body.next);
    try {
      const { user, token } = verifyCode(db, req.body.phone, req.body.code, now());
      const name = String(req.body.name ?? '').trim().slice(0, 60);
      if (name && !user.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
      if (LANGS.includes(req.cookies.lang)) db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(req.cookies.lang, user.id);
      res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: secureCookies, maxAge: SESSION_TTL_MS });
      res.redirect(withFlash(next, 'ok', 'welcome'));
    } catch (err) {
      if (!(err instanceof AuthError)) throw err;
      const ctx = { ...req.ctx, err: err.code };
      if (err.code === 'too_many_attempts') return res.status(400).send(views.loginPage(ctx, { next, phone: req.body.phone }));
      res.status(400).send(views.verifyPage(ctx, { next, phone: req.body.phone, devCode: null }));
    }
  });

  app.post('/logout', (req, res) => {
    endSession(db, req.cookies[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE);
    res.redirect('/');
  });

  app.get('/lang/:lang', (req, res) => {
    const lang = LANGS.includes(req.params.lang) ? req.params.lang : DEFAULT_LANG;
    res.cookie('lang', lang, { sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 });
    if (req.user) db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(lang, req.user.id);
    res.redirect(safeNext(req.query.next));
  });

  app.get('/owner', requireOwner, (req, res) => {
    const dates = dateParam(req);
    const venues = ownedVenues(db, req.user).map((v) => ({
      ...v,
      pitches: listPitches(db, v.id).map((p) => ({ ...p, slots: getSchedule(db, p.id, dates.date, now()) })),
    }));
    res.send(views.ownerPage(req.ctx, { venues, ...dates }));
  });

  app.post(
    '/owner/bookings/:id/confirm',
    requireOwner,
    act((req) => {
      confirmBooking(db, { bookingId: Number(req.params.id), user: req.user });
      return { ok: 'confirmed' };
    }),
  );

  app.post(
    '/owner/bookings/:id/cancel',
    requireOwner,
    act((req) => {
      cancelBooking(db, { bookingId: Number(req.params.id), user: req.user, now: now() });
      return { ok: 'cancelled' };
    }),
  );

  app.post(
    '/owner/blocks',
    requireOwner,
    act((req) => {
      const { pitchId, date, hour } = req.body;
      blockSlot(db, { pitchId: Number(pitchId), date, hour, user: req.user });
      return { ok: 'blocked' };
    }),
  );

  app.post(
    '/owner/blocks/:id/delete',
    requireOwner,
    act((req) => {
      unblockSlot(db, { blockId: Number(req.params.id), user: req.user });
      return { ok: 'unblocked' };
    }),
  );

  app.get('/owner/venues/:id/settings', requireOwner, (req, res) => {
    const venue = ownedVenues(db, req.user).find((v) => v.id === Number(req.params.id));
    if (!venue) return res.status(404).send(views.notFoundPage(req.ctx));
    res.send(views.settingsPage(req.ctx, venue));
  });

  app.post(
    '/owner/venues/:id/settings',
    requireOwner,
    act((req) => {
      updateVenueSettings(db, { venueId: Number(req.params.id), user: req.user, settings: req.body });
      return { ok: 'saved', to: '/owner' };
    }),
  );

  app.use((req, res) => res.status(404).send(views.notFoundPage(req.ctx)));

  return app;
}
