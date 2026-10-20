import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DayStrip, ErrorBox, Icon, Loading } from '../components/ui';
import { useAuth } from '../lib/auth';
import { category, hueStyle } from '../lib/categories';
import { useI18n } from '../lib/i18n';
import { formatHour, money } from '../lib/time';
import { errorKey, useAsync } from '../lib/useAsync';
import { useToast } from '../lib/toast';
import { useApi } from '../services/ApiContext';
import type { Resource, Slot } from '../services/types';

export function VenuePage() {
  const api = useApi();
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const venueId = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? undefined;
  const [busy, setBusy] = useState<string | null>(null);

  const venue = useAsync(() => api.getVenue(venueId), [api, venueId]);
  const schedule = useAsync(() => api.getSchedule(venueId, date), [api, venueId, date, user?.id]);

  if (venue.error) {
    return venue.error.code === 'not_found' ? <NotFoundInline /> : <ErrorBox error={venue.error} onRetry={venue.reload} />;
  }
  if (!venue.data) return <Loading />;
  const v = venue.data;
  const c = category(v.category);
  const price = (n: number) => (n === 0 ? t('freeOfCharge') : money(n));

  const book = async (resource: Resource, slot: Slot) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/venues/${v.id}?date=${schedule.data?.date ?? ''}`)}`);
      return;
    }
    const key = `${resource.id}-${slot.hour}`;
    setBusy(key);
    try {
      await api.createBooking({ resourceId: resource.id, date: schedule.data!.date, hour: slot.hour });
      toast('ok', t('ok_booked'));
      navigate('/me');
    } catch (err) {
      toast('err', t(errorKey(err)));
      schedule.reload();
    } finally {
      setBusy(null);
    }
  };

  const slotCell = (resource: Resource, slot: Slot) => {
    const time = <span className="slot-time">{formatHour(slot.hour)}</span>;
    if (slot.mine) {
      return (
        <div key={slot.hour} className="slot slot-mine">
          {time}
          <span className="slot-sub">{t('yourBooking')}</span>
        </div>
      );
    }
    if (slot.status !== 'free') {
      return (
        <div key={slot.hour} className={`slot slot-${slot.status}`}>
          {time}
          <span className="slot-sub">{t(slot.status)}</span>
        </div>
      );
    }
    const key = `${resource.id}-${slot.hour}`;
    return (
      <button
        type="button"
        key={slot.hour}
        className="slot slot-free"
        disabled={busy !== null}
        aria-busy={busy === key}
        title={t('book')}
        onClick={() => void book(resource, slot)}
      >
        {time}
        <span className="slot-sub">{busy === key ? t('sending') : price(slot.price)}</span>
        {resource.capacity > 1 && <span className="slot-sub slot-left">{t('spotsLeft', { n: slot.left })}</span>}
      </button>
    );
  };

  return (
    <>
      <section className="venue-hero" style={hueStyle(v.category)}>
        <Link className="back-link" to={`/?category=${c.id}`}>
          {Icon.arrow}
          {t('back')}
        </Link>
        <div className="venue-hero-row">
          <span className="venue-hero-icon">{c.icon}</span>
          <div>
            <span className="pill pill-glass">{t(`cat_${c.id}`)}</span>
            <h1>{v.name}</h1>
            <p className="venue-address">
              {Icon.pin}
              {v.address}
            </p>
          </div>
        </div>
        {v.description && <p className="venue-desc">{v.description}</p>}
        <div className="info-chips">
          <span className="info-chip">
            {Icon.clock}
            {t('hours')}: {formatHour(v.openHour)}–{formatHour(v.closeHour)}
          </span>
          <span className="info-chip">
            {Icon.wallet}
            {v.dayPrice === v.eveningPrice ? price(v.dayPrice) : `${money(v.dayPrice)} – ${money(v.eveningPrice)}`}
            {v.eveningPrice ? ` ${t('perHour')}` : ''}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">{t('chooseTime')}</h2>
        {!user && (
          <div className="notice">
            {Icon.user}
            {t('loginToBook')}
          </div>
        )}
        {schedule.error ? (
          <ErrorBox error={schedule.error} onRetry={schedule.reload} />
        ) : !schedule.data ? (
          <Loading />
        ) : (
          <>
            <DayStrip
              date={schedule.data.date}
              today={schedule.data.today}
              maxDate={schedule.data.maxDate}
              onSelect={(d) => setParams({ date: d })}
            />
            {schedule.data.resources.every((r) => r.slots.every((s) => s.status !== 'free')) && (
              <p className="fine-print">{t('tryAnotherDay')}</p>
            )}
            {schedule.data.resources.map(({ resource, slots }) => (
              <section className="resource" key={resource.id}>
                <div className="resource-head">
                  <h3>{resource.name}</h3>
                  {resource.capacity > 1 && (
                    <span className="pill pill-soft">
                      {Icon.users}
                      {t('capacity', { n: resource.capacity })}
                    </span>
                  )}
                </div>
                <div className="slot-grid" aria-busy={schedule.loading}>
                  {slots.map((slot) => slotCell(resource, slot))}
                </div>
              </section>
            ))}
          </>
        )}
        <p className="fine-print">
          {t('payOnSite')} {t('cancelRule')}
        </p>
      </section>
    </>
  );
}

function NotFoundInline() {
  const { t } = useI18n();
  return (
    <section className="auth">
      <span className="auth-icon">🔍</span>
      <h1>{t('notFound')}</h1>
      <Link className="btn btn-primary" to="/">
        {t('findPlace')}
      </Link>
    </section>
  );
}
