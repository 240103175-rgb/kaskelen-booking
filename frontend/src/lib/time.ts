// All business times are in Asia/Almaty. Instants travel as ISO strings (UTC).
import type { Lang } from '../services/types';

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

export function localParts(ms: number): { date: string; hour: number; minute: number } {
  const p = Object.fromEntries(partsFormat.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

function offsetMs(ms: number): number {
  const { date, hour, minute } = localParts(ms);
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour, minute) - (ms - (ms % 60000));
}

/** UTC instant of a local Asia/Almaty date and hour. Hour 24 means midnight of the next day. */
export function localToUtc(date: string, hour: number): number {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  return guess - offsetMs(guess);
}

export function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function todayLocal(now: number = Date.now()): string {
  return localParts(now).date;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Own tables instead of Intl: many browsers ship without Kazakh locale data (#40).
const MONTHS: Record<Lang, string[]> = {
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};
const WEEKDAYS: Record<Lang, string[]> = {
  kk: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
};

/** "20 қазан, сейсенбі" / "Вторник, 20 октября". */
export function formatDate(date: string, lang: Lang): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const month = MONTHS[lang][m - 1];
  return lang === 'ru' ? `${weekday}, ${d} ${month}` : `${d} ${month}, ${weekday}`;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  kk: ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

export function dayLabel(date: string, lang: Lang): { weekday: string; day: number } {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { weekday: WEEKDAYS_SHORT[lang][weekday], day: d };
}

export function dateRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export function money(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₸`;
}
