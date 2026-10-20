import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DayStrip, Empty, ErrorBox, Icon, Loading } from '../components/ui';
import { category } from '../lib/categories';
import { useI18n } from '../lib/i18n';
import { formatHour, money } from '../lib/time';
import { errorKey, useAsync } from '../lib/useAsync';
import { useToast } from '../lib/toast';
import { useApi } from '../services/ApiContext';
import type { Resource, Slot } from '../services/types';

export function OwnerPage() {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const venues = useAsync(() => api.ownerVenues(), [api]);
  const requested = Number(params.get('venue'));
  const venueId = venues.data?.find((v) => v.id === requested)?.id ?? venues.data?.[0]?.id ?? null;
  const date = params.get('date') ?? undefined;
  const schedule = useAsync(
    () => (venueId ? api.ownerSchedule(venueId, date) : Promise.resolve(null)),
    [api, venueId, date],
  );
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, okKey: string) => {
    setBusy(true);
    try {
      await action();
      toast('ok', t(okKey));
    } catch (err) {
      toast('err', t(errorKey(err)));
    } finally {
      setBusy(false);
      schedule.reload();
    }
  };

  if (venues.error) return <ErrorBox error={venues.error} onRetry={venues.reload} />;
  if (!venues.data) return <Loading />;
  if (!venues.data.length || venueId === null) {
    return (
      <>
        <h1>{t('ownerPanel')}</h1>
        <Empty>{t('noVenuesOwner')}</Empty>
      </>
    );
  }
  const price = (n: number) => (n === 0 ? t('freeOfCharge') : money(n));
  const go = (next: { venue?: number; date?: string }) =>
    setParams({ venue: String(next.venue ?? venueId), ...(next.date ?? date ? { date: next.date ?? date! } : {}) });

  const slotRow = (resource: Resource, s: Slot) => {
    const sd = schedule.data!;
    const people = (s.bookings ?? []).map((b) => (
      <div className="owner-booking" key={b.id}>
        <span className={`status status-${b.status}`}>{t(`status_${b.status}`)}</span>
        <span className="owner-person">
          {b.customerName || t('customer')} · <a href={`tel:${b.customerPhone}`}>{b.customerPhone}</a>
        </span>
        <span className="owner-actions">
          {b.status === 'pending' && (
            <button type="button" className="btn btn-primary btn-xs" disabled={busy} onClick={() => void run(() => api.confirmBooking(b.id), 'ok_confirmed')}>
              {t('confirm')}
            </button>
          )}
          <button type="button" className="btn btn-danger-soft btn-xs" disabled={busy} onClick={() => void run(() => api.cancelBooking(b.id), 'ok_cancelled')}>
            {t('cancel')}
          </button>
        </span>
      </div>
    ));
    let side = null;
    if (s.blockId !== null) {
      side = (
        <>
          <span className="status status-blocked">{t('blocked')}</span>
          <button type="button" className="btn btn-ghost btn-xs" disabled={busy} onClick={() => void run(() => api.unblockSlot(s.blockId!), 'ok_unblocked')}>
            {t('unblock')}
          </button>
        </>
      );
    } else if (!people.length && s.status !== 'past') {
      side = (
        <>
          <span className="muted">
            {t('free')} · {price(s.price)}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={busy}
            onClick={() => void run(() => api.blockSlot({ resourceId: resource.id, date: sd.date, hour: s.hour }), 'ok_blocked')}
          >
            {t('block')}
          </button>
        </>
      );
    } else if (!people.length) {
      side = <span className="muted">{t('past')}</span>;
    } else if (resource.capacity > 1) {
      side = <span className="muted">{t('spotsLeft', { n: s.left })}</span>;
    }
    return (
      <li key={s.hour} className={`owner-slot${s.status === 'past' ? ' is-past' : ''}`}>
        <span className="slot-time">{formatHour(s.hour)}</span>
        <div className="owner-slot-body">
          {side && <div className="owner-side">{side}</div>}
          {people}
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="page-head">
        <h1>{t('ownerPanel')}</h1>
        <Link className="btn btn-ghost" to={`/owner/venues/${venueId}/settings`}>
          {t('settings')}
        </Link>
      </div>
      <div className="chips">
        {venues.data.map((v) => (
          <button
            type="button"
            key={v.id}
            className={`chip${v.id === venueId ? ' is-active' : ''}`}
            onClick={() => go({ venue: v.id })}
          >
            {category(v.category).icon} {v.name}
          </button>
        ))}
      </div>
      <section className="panel">
        {schedule.error ? (
          <ErrorBox error={schedule.error} onRetry={schedule.reload} />
        ) : !schedule.data ? (
          <Loading />
        ) : (
          <>
            <DayStrip date={schedule.data.date} today={schedule.data.today} maxDate={schedule.data.maxDate} onSelect={(d) => go({ date: d })} />
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
                <ul className="owner-slots">{slots.map((s) => slotRow(resource, s))}</ul>
              </section>
            ))}
          </>
        )}
      </section>
    </>
  );
}
