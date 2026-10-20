import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate } from '../lib/time';

afterEach(() => vi.restoreAllMocks());

describe('formatDate (#40)', () => {
  it('formats Kazakh and Russian dates', () => {
    expect(formatDate('2026-10-20', 'kk')).toBe('20 қазан, сейсенбі');
    expect(formatDate('2026-10-20', 'ru')).toBe('Вторник, 20 октября');
  });

  it('does not depend on the browser having Kazakh locale data', () => {
    const Real = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((_locale: string, opts: Intl.DateTimeFormatOptions) =>
      new Real('en-US', opts)) as unknown as typeof Intl.DateTimeFormat);
    expect(formatDate('2026-10-20', 'kk')).toBe('20 қазан, сейсенбі');
    expect(formatDate('2026-10-20', 'ru')).toBe('Вторник, 20 октября');
  });

  it('uses a month name for every month', () => {
    for (let m = 1; m <= 12; m++) {
      const date = `2026-${String(m).padStart(2, '0')}-05`;
      expect(formatDate(date, 'kk')).not.toMatch(/M\d/);
      expect(formatDate(date, 'ru')).toMatch(/^[А-Я][а-я]+, 5 [а-я]+$/);
    }
  });
});
