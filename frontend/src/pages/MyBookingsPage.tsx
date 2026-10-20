import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Loading } from '../components/ui';
import { category, hueStyle } from '../lib/categories';
import { useI18n } from '../lib/i18n';
import { formatDate, formatHour, money } from '../lib/time';
import { errorKey, useAsync } from '../lib/useAsync';
import { useToast } from '../lib/toast';
import { useApi } from '../services/ApiContext';
import type { Booking } from '../services/types';

export function MyBookingsPage({ now = Date.now }: { now?: () => number }) {
  const api = useApi();
  const { t, lang } = useI18n();
  const toast = useToast();
  const bookings = useAsync(() => api.myBookings(), [api]);
  const [busy, setBusy] = useState<number | null>(null);

  const cancel = async (b: Booking) => {
    if (!window.confirm(t('confirmCancel'))) return;
    setBusy(b.id);
    try {
      await api.cancelBooking(b.id);
      toast('ok', t('ok_cancelled'));
    } catch (err) {
      toast('err', t(errorKey(err)));
    } finally {
      setBusy(null);
      bookings.reload();
    }
  };

  const card = (b: Booking, canCancel: boolean) => (
    <li key={b.id} className={`booking-card booking-${b.status}`} style={hueStyle(b.category)} data-testid="booking-card">
      <span className="booking-icon">{category(b.category).icon}</span>
      <div className="booking-main">
        <Link className="booking-title" to={`/venues/${b.venueId}`}>
          {b.venueName}
        </Link>
        <div className="booking-sub">
          {b.resourceName} · {formatDate(b.date, lang)}, {formatHour(b.hour)}–{formatHour(b.hour + 1)}
        </div>
        <div className="booking-tags">
          <span className={`status status-${b.status}`}>{t(`status_${b.status}`)}</span>
          <span className="booking-price">{b.price === 0 ? t('freeOfCharge') : money(b.price)}</span>
        </div>
      </div>
      {canCancel && (
        <button type="button" className="btn btn-danger-soft btn-sm" disabled={busy === b.id} onClick={() => void cancel(b)}>
          {t('cancel')}
        </button>
      )}
    </li>
  );

  let body;
  if (bookings.error) body = <ErrorBox error={bookings.error} onRetry={bookings.reload} />;
  else if (!bookings.data) body = <Loading />;
  else {
    const at = now();
    const upcoming = bookings.data.filter((b) => Date.parse(b.startAt) > at && b.status !== 'cancelled').reverse();
    const past = bookings.data.filter((b) => Date.parse(b.startAt) <= at || b.status === 'cancelled');
    body = (
      <>
        <h2 className="section-title">{t('upcoming')}</h2>
        {upcoming.length ? <ul className="booking-list">{upcoming.map((b) => card(b, true))}</ul> : <Empty>{t('noBookings')}</Empty>}
        <p className="fine-print">{t('cancelRule')}</p>
        <h2 className="section-title">{t('pastBookings')}</h2>
        {past.length ? <ul className="booking-list">{past.map((b) => card(b, false))}</ul> : <Empty>{t('noBookings')}</Empty>}
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('myBookings')}</h1>
        <Link className="btn btn-primary" to="/">
          {t('findPlace')}
        </Link>
      </div>
      {body}
    </>
  );
}
