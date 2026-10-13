import { CATEGORIES, category } from './categories.js';
import { addDays, dayLabel, formatDate, formatHour, localParts } from './time.js';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (n) => `${Number(n).toLocaleString('ru-RU')} ₸`;
const price = (t, n) => (n === 0 ? t('freeOfCharge') : money(n));

const ICONS = {
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12.5h2M3 10h18"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg>',
};

function flash(ctx) {
  const parts = [];
  if (ctx.ok) parts.push(`<div class="toast toast-ok" role="status">${esc(ctx.t(`ok_${ctx.ok}`))}</div>`);
  if (ctx.err) parts.push(`<div class="toast toast-err" role="alert">${esc(ctx.t(`err_${ctx.err}`))}</div>`);
  return parts.length ? `<div class="toasts">${parts.join('')}</div>` : '';
}

export function layout(ctx, title, body) {
  const { t, user, lang, path } = ctx;
  const other = lang === 'kk' ? 'ru' : 'kk';
  const links = [];
  if (user && (user.role === 'owner' || user.role === 'admin')) links.push(`<a class="nav-link" href="/owner">${t('ownerPanel')}</a>`);
  if (user) links.push(`<a class="nav-link" href="/me">${t('myBookings')}</a>`);
  const account = user
    ? `<form method="post" action="/logout" class="inline"><button class="btn btn-ghost btn-sm">${t('logout')}</button></form>`
    : `<a class="btn btn-primary btn-sm" href="/login?next=${encodeURIComponent(path)}">${t('login')}</a>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#4f46e5">
<title>${esc(title)} · Kaskelen Booking</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a class="brand" href="/"><span class="brand-mark">K</span><span class="brand-name">Kaskelen<b>Booking</b></span></a>
    <nav class="nav">
      ${links.join('')}
      <a class="lang-toggle" href="/lang/${other}?next=${encodeURIComponent(path)}" aria-label="Language">${other === 'ru' ? 'РУС' : 'ҚАЗ'}</a>
      ${account}
    </nav>
  </div>
</header>
${flash(ctx)}
<main class="main">
${body}
</main>
<footer class="footer">
  <div class="footer-inner">
    <a class="brand" href="/"><span class="brand-mark">K</span><span class="brand-name">Kaskelen<b>Booking</b></span></a>
    <p>${t('footerText')} ${t('payOnSite')}</p>
    <p class="footer-copy">© ${new Date().getFullYear()} Kaskelen Booking</p>
  </div>
</footer>
</body>
</html>`;
}

function categoryTile(ctx, c, count, active) {
  return `<a class="cat-tile${active ? ' is-active' : ''}" href="/?category=${c.id}#places" style="--h:${c.hue};--h2:${c.hue2}">
    <span class="cat-icon">${c.icon}</span>
    <span class="cat-name">${ctx.t(`cat_${c.id}`)}</span>
    <span class="cat-count">${count} ${ctx.t('places')}</span>
  </a>`;
}

function venueCard(ctx, v) {
  const { t } = ctx;
  const c = category(v.category);
  const minPrice = Math.min(v.day_price, v.evening_price);
  return `<a class="venue-card" href="/venues/${v.id}" style="--h:${c.hue};--h2:${c.hue2}">
    <div class="venue-cover"${v.photo_url ? ` style="background-image:url('${esc(v.photo_url)}')"` : ''}>
      <span class="venue-cover-icon">${c.icon}</span>
      <span class="pill pill-glass">${t(`cat_${c.id}`)}</span>
    </div>
    <div class="venue-body">
      <h3>${esc(v.name)}</h3>
      <p class="venue-address">${ICONS.pin}${esc(v.address)}</p>
      <div class="venue-meta">
        <span>${ICONS.clock}${formatHour(v.open_hour)}–${formatHour(v.close_hour)}</span>
        <strong>${minPrice === 0 ? t('freeOfCharge') : t('priceFrom', { price: money(minPrice) })}</strong>
      </div>
    </div>
  </a>`;
}

export function homePage(ctx, { venues, counts, activeCategory, query }) {
  const { t } = ctx;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const chips = [
    `<a class="chip${activeCategory ? '' : ' is-active'}" href="/${query ? `?q=${encodeURIComponent(query)}` : ''}#places">${t('allCategories')} <span>${total}</span></a>`,
    ...CATEGORIES.map(
      (c) =>
        `<a class="chip${activeCategory === c.id ? ' is-active' : ''}" href="/?category=${c.id}${query ? `&q=${encodeURIComponent(query)}` : ''}#places">${c.icon} ${t(`cat_${c.id}`)}</a>`,
    ),
  ].join('');

  return layout(
    ctx,
    t('heroTitle'),
    `<section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-content">
        <span class="pill pill-soft">📍 ${t('heroBadge')}</span>
        <h1>${t('heroTitle')}</h1>
        <p class="hero-lead">${t('heroText')}</p>
        <form class="search" action="/" method="get" role="search">
          ${ICONS.search}
          <input type="search" name="q" value="${esc(query)}" placeholder="${esc(t('searchPlaceholder'))}" aria-label="${esc(t('search'))}">
          ${activeCategory ? `<input type="hidden" name="category" value="${esc(activeCategory)}">` : ''}
          <button class="btn btn-primary">${t('search')}</button>
        </form>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">${t('categories')}</h2>
      <div class="cat-grid">${CATEGORIES.map((c) => categoryTile(ctx, c, counts[c.id] ?? 0, activeCategory === c.id)).join('')}</div>
    </section>

    <section class="section" id="places">
      <h2 class="section-title">${activeCategory ? t(`cat_${activeCategory}`) : t('allPlaces')}</h2>
      <div class="chips">${chips}</div>
      ${venues.length ? `<div class="venue-grid">${venues.map((v) => venueCard(ctx, v)).join('')}</div>` : `<div class="empty">${t('nothingFound')}</div>`}
    </section>

    <section class="section">
      <h2 class="section-title">${t('howItWorks')}</h2>
      <div class="steps">
        ${[1, 2, 3]
          .map(
            (n) => `<div class="step"><span class="step-num">${n}</span><h3>${t(`step${n}Title`)}</h3><p>${t(`step${n}`)}</p></div>`,
          )
          .join('')}
      </div>
    </section>`,
  );
}

function dayStrip(ctx, baseUrl, { date, today, maxDate }) {
  const { lang, t } = ctx;
  const sep = baseUrl.includes('?') ? '&' : '?';
  const days = [];
  for (let d = today; d <= maxDate; d = addDays(d, 1)) {
    const { weekday, day } = dayLabel(d, lang);
    days.push(`<a class="day${d === date ? ' is-active' : ''}" href="${baseUrl}${sep}date=${d}">
      <span class="day-week">${d === today ? t('today') : weekday}</span>
      <span class="day-num">${day}</span>
    </a>`);
  }
  return `<div class="day-strip" role="navigation">${days.join('')}</div>
    <p class="day-current">${esc(formatDate(date, lang))}</p>`;
}

function slotCell(ctx, { venue, resource, date, slot }) {
  const { t, user } = ctx;
  const time = `<span class="slot-time">${formatHour(slot.hour)}</span>`;
  if (slot.mine) return `<div class="slot slot-mine">${time}<span class="slot-sub">${t('yourBooking')}</span></div>`;
  if (slot.status !== 'free') return `<div class="slot slot-${slot.status}">${time}<span class="slot-sub">${t(slot.status)}</span></div>`;
  const sub = `<span class="slot-sub">${price(t, slot.price)}</span>${
    resource.capacity > 1 ? `<span class="slot-sub slot-left">${t('spotsLeft', { n: slot.left })}</span>` : ''
  }`;
  if (!user) {
    return `<a class="slot slot-free" href="/login?next=${encodeURIComponent(`/venues/${venue.id}?date=${date}`)}">${time}${sub}</a>`;
  }
  return `<form method="post" action="/bookings" class="slot-form">
    <input type="hidden" name="resourceId" value="${resource.id}">
    <input type="hidden" name="date" value="${date}">
    <input type="hidden" name="hour" value="${slot.hour}">
    <button class="slot slot-free" title="${esc(t('book'))}">${time}${sub}</button>
  </form>`;
}

export function venuePage(ctx, { venue, resources, date, today, maxDate }) {
  const { t, user } = ctx;
  const c = category(venue.category);
  const resourceBlocks = resources
    .map(
      (r) => `<section class="resource">
        <div class="resource-head">
          <h3>${esc(r.name)}</h3>
          ${r.capacity > 1 ? `<span class="pill pill-soft">${ICONS.users}${t('capacity', { n: r.capacity })}</span>` : ''}
        </div>
        <div class="slot-grid">${r.slots.map((slot) => slotCell(ctx, { venue, resource: r, date, slot })).join('')}</div>
      </section>`,
    )
    .join('');

  return layout(
    ctx,
    venue.name,
    `<section class="venue-hero" style="--h:${c.hue};--h2:${c.hue2}">
      <a class="back-link" href="/?category=${c.id}#places">${ICONS.arrow}${t('back')}</a>
      <div class="venue-hero-row">
        <span class="venue-hero-icon">${c.icon}</span>
        <div>
          <span class="pill pill-glass">${t(`cat_${c.id}`)}</span>
          <h1>${esc(venue.name)}</h1>
          <p class="venue-address">${ICONS.pin}${esc(venue.address)}</p>
        </div>
      </div>
      ${venue.description ? `<p class="venue-desc">${esc(venue.description)}</p>` : ''}
      <div class="info-chips">
        <span class="info-chip">${ICONS.clock}${t('hours')}: ${formatHour(venue.open_hour)}–${formatHour(venue.close_hour)}</span>
        <span class="info-chip">${ICONS.wallet}${
          venue.day_price === venue.evening_price ? price(t, venue.day_price) : `${money(venue.day_price)} – ${money(venue.evening_price)}`
        } ${venue.evening_price ? t('perHour') : ''}</span>
      </div>
    </section>

    <section class="panel">
      <h2 class="panel-title">${t('chooseTime')}</h2>
      ${user ? '' : `<div class="notice">${ICONS.user}${t('loginToBook')}</div>`}
      ${dayStrip(ctx, `/venues/${venue.id}`, { date, today, maxDate })}
      ${resourceBlocks}
      <p class="fine-print">${t('payOnSite')} ${t('cancelRule')}</p>
    </section>`,
  );
}

function bookingCard(ctx, b, { canCancel }) {
  const { t, lang } = ctx;
  const c = category(b.category);
  const { date, hour } = localParts(b.start_at);
  return `<li class="booking-card booking-${b.status}" style="--h:${c.hue};--h2:${c.hue2}">
    <span class="booking-icon">${c.icon}</span>
    <div class="booking-main">
      <a class="booking-title" href="/venues/${b.venue_id}">${esc(b.venue_name)}</a>
      <div class="booking-sub">${esc(b.resource_name)} · ${esc(formatDate(date, lang))}, ${formatHour(hour)}–${formatHour(hour + 1)}</div>
      <div class="booking-tags">
        <span class="status status-${b.status}">${t(`status_${b.status}`)}</span>
        <span class="booking-price">${price(t, b.price)}</span>
      </div>
    </div>
    ${canCancel ? `<form method="post" action="/bookings/${b.id}/cancel"><button class="btn btn-danger-soft btn-sm">${t('cancel')}</button></form>` : ''}
  </li>`;
}

export function myBookingsPage(ctx, { bookings, now }) {
  const { t } = ctx;
  const upcoming = bookings.filter((b) => b.start_at > now && b.status !== 'cancelled').reverse();
  const past = bookings.filter((b) => b.start_at <= now || b.status === 'cancelled');
  const list = (items, canCancel) =>
    items.length
      ? `<ul class="booking-list">${items.map((b) => bookingCard(ctx, b, { canCancel })).join('')}</ul>`
      : `<div class="empty">${t('noBookings')}</div>`;
  return layout(
    ctx,
    t('myBookings'),
    `<div class="page-head">
      <h1>${t('myBookings')}</h1>
      <a class="btn btn-primary" href="/">${t('findPlace')}</a>
    </div>
    <h2 class="section-title">${t('upcoming')}</h2>
    ${list(upcoming, true)}
    <p class="fine-print">${t('cancelRule')}</p>
    <h2 class="section-title">${t('pastBookings')}</h2>
    ${list(past, false)}`,
  );
}

export function loginPage(ctx, { next, phone = '' }) {
  const { t } = ctx;
  return layout(
    ctx,
    t('login'),
    `<section class="auth">
      <span class="auth-icon">👋</span>
      <h1>${t('login')}</h1>
      <p class="muted">${t('loginLead')}</p>
      <form method="post" action="/login" class="form">
        <input type="hidden" name="next" value="${esc(next)}">
        <label>${t('phone')}
          <input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 701 234 56 78" value="${esc(phone)}" required autofocus>
        </label>
        <button class="btn btn-primary btn-block">${t('getCode')}</button>
      </form>
    </section>`,
  );
}

export function verifyPage(ctx, { next, phone, devCode }) {
  const { t } = ctx;
  return layout(
    ctx,
    t('login'),
    `<section class="auth">
      <span class="auth-icon">🔐</span>
      <h1>${t('login')}</h1>
      <p class="muted">${esc(t('codeSent', { phone }))}</p>
      ${devCode ? `<div class="notice">${esc(t('devCode', { code: devCode }))}</div>` : ''}
      <form method="post" action="/login/verify" class="form">
        <input type="hidden" name="next" value="${esc(next)}">
        <input type="hidden" name="phone" value="${esc(phone)}">
        <label>${t('code')}
          <input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required autofocus>
        </label>
        <label>${t('yourName')}
          <input name="name" autocomplete="given-name" maxlength="60">
        </label>
        <button class="btn btn-primary btn-block">${t('confirmLogin')}</button>
      </form>
      <a class="auth-alt" href="/login?next=${encodeURIComponent(next)}">${t('otherNumber')}</a>
    </section>`,
  );
}

export function ownerPage(ctx, { venues, venue, date, today, maxDate }) {
  const { t } = ctx;
  if (!venue) return layout(ctx, t('ownerPanel'), `<h1>${t('ownerPanel')}</h1><div class="empty">${t('noVenuesOwner')}</div>`);

  const tabs = venues
    .map((v) => `<a class="chip${v.id === venue.id ? ' is-active' : ''}" href="/owner?venue=${v.id}&date=${date}">${category(v.category).icon} ${esc(v.name)}</a>`)
    .join('');

  const slotRow = (resource, s) => {
    const people = s.bookings
      .map(
        (b) => `<div class="owner-booking">
          <span class="status status-${b.status}">${t(`status_${b.status}`)}</span>
          <span class="owner-person">${esc(b.user_name || t('customer'))} · <a href="tel:${esc(b.user_phone)}">${esc(b.user_phone)}</a></span>
          <span class="owner-actions">
            ${b.status === 'pending' ? `<form method="post" action="/owner/bookings/${b.id}/confirm"><button class="btn btn-primary btn-xs">${t('confirm')}</button></form>` : ''}
            <form method="post" action="/owner/bookings/${b.id}/cancel"><button class="btn btn-danger-soft btn-xs">${t('cancel')}</button></form>
          </span>
        </div>`,
      )
      .join('');
    let side = '';
    if (s.block) {
      side = `<span class="status status-blocked">${t('blocked')}</span>
        <form method="post" action="/owner/blocks/${s.block.id}/delete"><button class="btn btn-ghost btn-xs">${t('unblock')}</button></form>`;
    } else if (!s.bookings.length && s.status !== 'past') {
      side = `<span class="muted">${t('free')} · ${price(t, s.price)}</span>
        <form method="post" action="/owner/blocks">
          <input type="hidden" name="resourceId" value="${resource.id}">
          <input type="hidden" name="date" value="${date}">
          <input type="hidden" name="hour" value="${s.hour}">
          <button class="btn btn-ghost btn-xs">${t('block')}</button>
        </form>`;
    } else if (!s.bookings.length) {
      side = `<span class="muted">${t('past')}</span>`;
    } else if (resource.capacity > 1) {
      side = `<span class="muted">${t('spotsLeft', { n: s.left })}</span>`;
    }
    return `<li class="owner-slot${s.status === 'past' ? ' is-past' : ''}">
      <span class="slot-time">${formatHour(s.hour)}</span>
      <div class="owner-slot-body">${side ? `<div class="owner-side">${side}</div>` : ''}${people}</div>
    </li>`;
  };

  return layout(
    ctx,
    t('ownerPanel'),
    `<div class="page-head">
      <h1>${t('ownerPanel')}</h1>
      <a class="btn btn-ghost" href="/owner/venues/${venue.id}/settings">${t('settings')}</a>
    </div>
    <div class="chips">${tabs}</div>
    <section class="panel">
      ${dayStrip(ctx, `/owner?venue=${venue.id}`, { date, today, maxDate })}
      ${venue.resources
        .map(
          (r) => `<section class="resource">
            <div class="resource-head"><h3>${esc(r.name)}</h3>${r.capacity > 1 ? `<span class="pill pill-soft">${ICONS.users}${t('capacity', { n: r.capacity })}</span>` : ''}</div>
            <ul class="owner-slots">${r.slots.map((s) => slotRow(r, s)).join('')}</ul>
          </section>`,
        )
        .join('')}
    </section>`,
  );
}

export function settingsPage(ctx, venue) {
  const { t } = ctx;
  const field = (name, label, value, attrs) =>
    `<label>${label}<input name="${name}" type="number" value="${esc(value)}" ${attrs} required></label>`;
  return layout(
    ctx,
    t('settings'),
    `<a class="back-link back-link-dark" href="/owner?venue=${venue.id}">${ICONS.arrow}${t('back')}</a>
    <section class="auth auth-wide">
      <span class="auth-icon">${category(venue.category).icon}</span>
      <h1>${esc(venue.name)}</h1>
      <form method="post" action="/owner/venues/${venue.id}/settings" class="form form-grid">
        ${field('open_hour', t('openHour'), venue.open_hour, 'min="0" max="23"')}
        ${field('close_hour', t('closeHour'), venue.close_hour, 'min="1" max="24"')}
        ${field('day_price', t('dayPrice'), venue.day_price, 'min="0" step="500"')}
        ${field('evening_price', t('eveningPrice'), venue.evening_price, 'min="0" step="500"')}
        ${field('evening_start_hour', t('eveningStart'), venue.evening_start_hour, 'min="0" max="24"')}
        <button class="btn btn-primary btn-block">${t('save')}</button>
      </form>
    </section>`,
  );
}

export function notFoundPage(ctx) {
  return layout(
    ctx,
    ctx.t('notFound'),
    `<section class="auth"><span class="auth-icon">🔍</span><h1>${ctx.t('notFound')}</h1><a class="btn btn-primary" href="/">${ctx.t('findPlace')}</a></section>`,
  );
}
