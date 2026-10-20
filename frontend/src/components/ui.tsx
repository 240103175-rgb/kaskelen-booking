import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isOwner, useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { dateRange, dayLabel, formatDate } from '../lib/time';
import { errorKey } from '../lib/useAsync';

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {d}
  </svg>
);

export const Icon = {
  pin: svg(
    <>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>,
  ),
  clock: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  wallet: svg(
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h2M3 10h18" />
    </>,
  ),
  search: svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
  ),
  arrow: svg(<path d="M15 6l-6 6 6 6" />),
  user: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  users: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>,
  ),
};

export function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">K</span>
      <span className="brand-name">
        Kaskelen<b>Booking</b>
      </span>
    </Link>
  );
}

export function Layout({ children, mock }: { children: ReactNode; mock: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const other = lang === 'kk' ? 'ru' : 'kk';
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav className="nav">
            {isOwner(user) && (
              <Link className="nav-link" to="/owner">
                {t('ownerPanel')}
              </Link>
            )}
            {user && (
              <Link className="nav-link" to="/me">
                {t('myBookings')}
              </Link>
            )}
            <button
              type="button"
              className="lang-toggle"
              aria-label="Language"
              onClick={() => setLang(other)}
            >
              {other === 'ru' ? 'РУС' : 'ҚАЗ'}
            </button>
            {user ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
                {t('logout')}
              </button>
            ) : (
              <Link className="btn btn-primary btn-sm" to={`/login?next=${next}`}>
                {t('login')}
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <div className="footer-inner">
          <Brand />
          <p>
            {t('footerText')} {t('payOnSite')}
          </p>
          <p className="footer-copy">
            © {new Date().getFullYear()} Kaskelen Booking{mock ? ` · ${t('mockBadge')}` : ''}
          </p>
        </div>
      </footer>
    </>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {t('loading')}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="error-box" role="alert">
      <strong>{t('errorTitle')}</strong>
      <p>{t(errorKey(error))}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function DayStrip({
  date,
  today,
  maxDate,
  onSelect,
}: {
  date: string;
  today: string;
  maxDate: string;
  onSelect(date: string): void;
}) {
  const { lang, t } = useI18n();
  return (
    <>
      <div className="day-strip" role="tablist">
        {dateRange(today, maxDate).map((d) => {
          const { weekday, day } = dayLabel(d, lang);
          return (
            <button
              type="button"
              role="tab"
              aria-selected={d === date}
              key={d}
              className={`day${d === date ? ' is-active' : ''}`}
              onClick={() => onSelect(d)}
            >
              <span className="day-week">{d === today ? t('today') : weekday}</span>
              <span className="day-num">{day}</span>
            </button>
          );
        })}
      </div>
      <p className="day-current">{formatDate(date, lang)}</p>
    </>
  );
}
