// All business times are in Asia/Almaty. Instants are stored as UTC milliseconds.
export const TZ = 'Asia/Almaty';
export const HOUR_MS = 60 * 60 * 1000;

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Local date ("YYYY-MM-DD"), hour and minute in Asia/Almaty for a UTC instant. */
export function localParts(ms) {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

function offsetMs(ms) {
  const { date, hour, minute } = localParts(ms);
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour, minute) - (ms - (ms % 60000));
}

/** UTC instant of a local Asia/Almaty date and hour. Hour 24 means midnight of the next day. */
export function localToUtc(date, hour) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  return guess - offsetMs(guess);
}

export function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function todayLocal(now) {
  return localParts(now).date;
}

export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatDate(date, lang) {
  const [y, m, d] = date.split('-').map(Number);
  const text = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'kk-KZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}
