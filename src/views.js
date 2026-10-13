import { addDays, formatDate, formatHour, localParts } from './time.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (n) => `${Number(n).toLocaleString('ru-RU')} ₸`;

function flash(ctx) {
  const parts = [];
  if (ctx.ok) parts.push(`<div class="flash flash-ok" role="status">${esc(ctx.t(`ok_${ctx.ok}`))}</div>`);
  if (ctx.err) parts.push(`<div class="flash flash-err" role="alert">${esc(ctx.t(`err_${ctx.err}`))}</div>`);
  return parts.join('');
}

export function layout(ctx, title, body) {
  const { t, user, lang, path } = ctx;
  const other = lang === 'kk' ? 'ru' : 'kk';
  const nav = [];
  if (user && (user.role === 'owner' || user.role === 'admin')) nav.push(`<a href="/owner">${t('ownerPanel')}</a>`);
  if (user) {
    nav.push(`<a href="/me">${t('myBookings')}</a>`);
    nav.push(`<form method="post" action="/logout" class="inline"><button class="link">${t('logout')}</button></form>`);
  } else {
    nav.push(`<a href="/login?next=${encodeURIComponent(path)}">${t('login')}</a>`);
  }
  nav.push(`<a class="lang" href="/lang/${other}?next=${encodeURIComponent(path)}">${other === 'ru' ? 'РУС' : 'ҚАЗ'}</a>`);

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Kaskelen Booking</title>
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/">⚽ Kaskelen Booking</a>
  <nav>${nav.join('')}</nav>
</header>
<main>
${flash(ctx)}
${body}
</main>
<footer class="footer">Kaskelen Booking · ${t('payOnSite')}</footer>
</body>
</html>`;
}

export function homePage(ctx, venues) {
  const { t } = ctx;
  const cards = venues
    .map(
      (v) => `
    <a class="card venue-card" href="/venues/${v.id}">
      <div class="venue-photo"${v.photo_url ? ` style="background-image:url('${esc(v.photo_url)}')"` : ''}><span>⚽</span></div>
      <div class="card-body">
        <h3>${esc(v.name)}</h3>
        <p class="muted">${esc(v.address)}</p>
        <p class="meta">
          <span>${v.pitch_count} ${t('pitches')}</span>
          <span>${formatHour(v.open_hour)}–${formatHour(v.close_hour)}</span>
          <strong>${t('priceFrom', { price: money(Math.min(v.day_price, v.evening_price)) })}</strong>
        </p>
      </div>
    </a>`,
    )
    .join('');
  return layout(
    ctx,
    t('venues'),
    `<section class="hero">
      <h1>${t('tagline')}</h1>
      <p>${t('heroText')}</p>
      <ol class="steps">
        <li>${t('step1')}</li><li>${t('step2')}</li><li>${t('step3')}</li>
      </ol>
    </section>
    <h2>${t('venues')}</h2>
    <div class="grid">${cards}</div>`,
  );
}

function dateNav(ctx, baseUrl, date, today, maxDate) {
  const { t, lang } = ctx;
  const prev = date > today ? `<a class="btn btn-ghost" href="${baseUrl}?date=${addDays(date, -1)}">${t('prevDay')}</a>` : '<span></span>';
  const next = date < maxDate ? `<a class="btn btn-ghost" href="${baseUrl}?date=${addDays(date, 1)}">${t('nextDay')}</a>` : '<span></span>';
  return `<div class="date-nav">
    ${prev}
    <strong>${date === today ? `${t('today')}, ` : ''}${esc(formatDate(date, lang))}</strong>
    ${next}
  </div>`;
}

export function venuePage(ctx, { venue, pitches, date, today, maxDate }) {
  const { t, user } = ctx;
  const pitchBlocks = pitches
    .map((p) => {
      const slots = p.slots
        .map((s) => {
          const label = `<span class="slot-time">${formatHour(s.hour)}</span>`;
          if (s.status !== 'free') {
            return `<div class="slot slot-${s.status}">${label}<span class="slot-status">${t(s.status)}</span></div>`;
          }
          const action = user
            ? `<form method="post" action="/bookings">
                 <input type="hidden" name="pitchId" value="${p.id}">
                 <input type="hidden" name="date" value="${date}">
                 <input type="hidden" name="hour" value="${s.hour}">
                 <button class="btn btn-small">${t('book')}</button>
               </form>`
            : `<a class="btn btn-small btn-ghost" href="/login?next=${encodeURIComponent(`/venues/${venue.id}?date=${date}`)}">${t('book')}</a>`;
          return `<div class="slot slot-free">${label}<span class="slot-price">${money(s.price)}</span>${action}</div>`;
        })
        .join('');
      return `<section class="pitch"><h3>${esc(p.name)}</h3><div class="slots">${slots}</div></section>`;
    })
    .join('');

  return layout(
    ctx,
    venue.name,
    `<a class="back" href="/">${t('back')}</a>
    <h1>${esc(venue.name)}</h1>
    <p class="muted">${esc(venue.address)}</p>
    <p class="meta">
      <span>${t('hours')}: ${formatHour(venue.open_hour)}–${formatHour(venue.close_hour)}</span>
      <span>${money(venue.day_price)} / ${money(venue.evening_price)} ${t('perHour')}</span>
    </p>
    ${user ? '' : `<p class="notice">${t('loginToBook')}</p>`}
    ${dateNav(ctx, `/venues/${venue.id}`, date, today, maxDate)}
    ${pitchBlocks}
    <p class="muted small">${t('payOnSite')} ${t('cancelRule')}</p>`,
  );
}

function bookingRow(ctx, b, { canCancel }) {
  const { t, lang } = ctx;
  const { date, hour } = localParts(b.start_at);
  return `<li class="booking booking-${b.status}">
    <div>
      <strong>${esc(b.venue_name)} · ${esc(b.pitch_name)}</strong>
      <div class="muted">${esc(formatDate(date, lang))}, ${formatHour(hour)}–${formatHour(hour + 1)} · ${money(b.price)}</div>
      <span class="badge badge-${b.status}">${t(`status_${b.status}`)}</span>
    </div>
    ${
      canCancel
        ? `<form method="post" action="/bookings/${b.id}/cancel"><button class="btn btn-small btn-danger">${t('cancel')}</button></form>`
        : ''
    }
  </li>`;
}

export function myBookingsPage(ctx, { bookings, now }) {
  const { t } = ctx;
  const upcoming = bookings.filter((b) => b.start_at > now && b.status !== 'cancelled').reverse();
  const past = bookings.filter((b) => b.start_at <= now || b.status === 'cancelled');
  const list = (items, canCancel) =>
    items.length
      ? `<ul class="bookings">${items.map((b) => bookingRow(ctx, b, { canCancel })).join('')}</ul>`
      : `<p class="muted">${t('noBookings')}</p>`;
  return layout(
    ctx,
    t('myBookings'),
    `<h1>${t('myBookings')}</h1>
    <h2>${t('upcoming')}</h2>
    ${list(upcoming, true)}
    <p class="muted small">${t('cancelRule')}</p>
    <a class="btn" href="/">${t('findPitch')}</a>
    <h2>${t('pastGames')}</h2>
    ${list(past, false)}`,
  );
}

export function loginPage(ctx, { next, phone = '' }) {
  const { t } = ctx;
  return layout(
    ctx,
    t('login'),
    `<section class="auth card">
      <h1>${t('login')}</h1>
      <form method="post" action="/login">
        <input type="hidden" name="next" value="${esc(next)}">
        <label>${t('phone')}
          <input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 701 234 56 78" value="${esc(phone)}" required>
        </label>
        <button class="btn btn-block">${t('getCode')}</button>
      </form>
    </section>`,
  );
}

export function verifyPage(ctx, { next, phone, devCode }) {
  const { t } = ctx;
  return layout(
    ctx,
    t('login'),
    `<section class="auth card">
      <h1>${t('login')}</h1>
      <p>${esc(t('codeSent', { phone }))}</p>
      ${devCode ? `<p class="notice">${esc(t('devCode', { code: devCode }))}</p>` : ''}
      <form method="post" action="/login/verify">
        <input type="hidden" name="next" value="${esc(next)}">
        <input type="hidden" name="phone" value="${esc(phone)}">
        <label>${t('code')}
          <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>
        </label>
        <label>${t('yourName')}
          <input name="name" autocomplete="given-name" maxlength="60">
        </label>
        <button class="btn btn-block">${t('confirmLogin')}</button>
      </form>
      <p><a href="/login?next=${encodeURIComponent(next)}">${t('otherNumber')}</a></p>
    </section>`,
  );
}

export function ownerPage(ctx, { venues, date, today, maxDate }) {
  const { t } = ctx;
  if (!venues.length) return layout(ctx, t('ownerPanel'), `<h1>${t('ownerPanel')}</h1><p>${t('noVenuesOwner')}</p>`);

  const slotRow = (pitch, s) => {
    let info = '';
    let actions = '';
    if (s.booking) {
      const b = s.booking;
      info = `<span class="badge badge-${b.status}">${t(`status_${b.status}`)}</span>
        <span>${esc(b.user_name || t('player'))} · <a href="tel:${esc(b.user_phone)}">${esc(b.user_phone)}</a></span>`;
      if (b.status === 'pending') {
        actions += `<form method="post" action="/owner/bookings/${b.id}/confirm"><button class="btn btn-small">${t('confirm')}</button></form>`;
      }
      actions += `<form method="post" action="/owner/bookings/${b.id}/cancel"><button class="btn btn-small btn-danger">${t('cancel')}</button></form>`;
    } else if (s.block) {
      info = `<span class="badge badge-blocked">${t('blocked')}</span>`;
      actions = `<form method="post" action="/owner/blocks/${s.block.id}/delete"><button class="btn btn-small btn-ghost">${t('unblock')}</button></form>`;
    } else if (s.status === 'past') {
      info = `<span class="muted">${t('past')}</span>`;
    } else {
      info = `<span class="muted">${t('free')} · ${money(s.price)}</span>`;
      actions = `<form method="post" action="/owner/blocks">
        <input type="hidden" name="pitchId" value="${pitch.id}">
        <input type="hidden" name="date" value="${date}">
        <input type="hidden" name="hour" value="${s.hour}">
        <button class="btn btn-small btn-ghost">${t('block')}</button>
      </form>`;
    }
    return `<li class="owner-slot owner-slot-${s.status}">
      <span class="slot-time">${formatHour(s.hour)}</span>
      <span class="owner-info">${info}</span>
      <span class="owner-actions">${actions}</span>
    </li>`;
  };

  const blocks = venues
    .map(
      (v) => `<section class="card owner-venue">
        <div class="owner-venue-head">
          <h2>${esc(v.name)}</h2>
          <a class="btn btn-small btn-ghost" href="/owner/venues/${v.id}/settings">${t('settings')}</a>
        </div>
        ${v.pitches
          .map((p) => `<h3>${esc(p.name)}</h3><ul class="owner-slots">${p.slots.map((s) => slotRow(p, s)).join('')}</ul>`)
          .join('')}
      </section>`,
    )
    .join('');

  return layout(
    ctx,
    t('ownerPanel'),
    `<h1>${t('ownerPanel')}</h1>
    ${dateNav(ctx, '/owner', date, today, maxDate)}
    ${blocks}`,
  );
}

export function settingsPage(ctx, venue) {
  const { t } = ctx;
  const field = (name, label, value, attrs) =>
    `<label>${label}<input name="${name}" type="number" value="${esc(value)}" ${attrs} required></label>`;
  return layout(
    ctx,
    t('settings'),
    `<a class="back" href="/owner">${t('back')}</a>
    <section class="card auth">
      <h1>${esc(venue.name)}</h1>
      <form method="post" action="/owner/venues/${venue.id}/settings">
        ${field('open_hour', t('openHour'), venue.open_hour, 'min="0" max="23"')}
        ${field('close_hour', t('closeHour'), venue.close_hour, 'min="1" max="24"')}
        ${field('day_price', t('dayPrice'), venue.day_price, 'min="0" step="500"')}
        ${field('evening_price', t('eveningPrice'), venue.evening_price, 'min="0" step="500"')}
        ${field('evening_start_hour', t('eveningStart'), venue.evening_start_hour, 'min="0" max="24"')}
        <button class="btn btn-block">${t('save')}</button>
      </form>
    </section>`,
  );
}

export function notFoundPage(ctx) {
  return layout(ctx, ctx.t('notFound'), `<h1>${ctx.t('notFound')}</h1><p><a href="/">${ctx.t('back')}</a></p>`);
}
