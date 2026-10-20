import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Empty, ErrorBox, Icon, Loading } from '../components/ui';
import { CATEGORIES, category, hueStyle, isCategoryId } from '../lib/categories';
import { useI18n } from '../lib/i18n';
import { formatHour, money } from '../lib/time';
import { useAsync } from '../lib/useAsync';
import { useApi } from '../services/ApiContext';
import type { VenueSummary } from '../services/types';

function VenueCard({ venue }: { venue: VenueSummary }) {
  const { t } = useI18n();
  const c = category(venue.category);
  const minPrice = Math.min(venue.dayPrice, venue.eveningPrice);
  return (
    <Link className="venue-card" to={`/venues/${venue.id}`} style={hueStyle(venue.category)} data-testid="venue-card">
      <div className="venue-cover">
        <span className="venue-cover-icon">{c.icon}</span>
        <span className="pill pill-glass">{t(`cat_${c.id}`)}</span>
      </div>
      <div className="venue-body">
        <h3>{venue.name}</h3>
        <p className="venue-address">
          {Icon.pin}
          {venue.address}
        </p>
        <div className="venue-meta">
          <span>
            {Icon.clock}
            {formatHour(venue.openHour)}–{formatHour(venue.closeHour)}
          </span>
          <strong>{minPrice === 0 ? t('freeOfCharge') : t('priceFrom', { price: money(minPrice) })}</strong>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const api = useApi();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const active = isCategoryId(params.get('category')) ? (params.get('category') as VenueSummary['category']) : null;
  const query = params.get('q') ?? '';
  const [draft, setDraft] = useState(query);

  const counts = useAsync(() => api.listCategories(), [api]);
  const venues = useAsync(() => api.listVenues({ category: active, q: query }), [api, active, query]);
  const total = counts.data?.reduce((sum, c) => sum + c.venueCount, 0) ?? 0;

  const setFilter = (next: { category?: string | null; q?: string }) => {
    const p = new URLSearchParams();
    const cat = next.category === undefined ? active : next.category;
    const q = next.q === undefined ? query : next.q;
    if (cat) p.set('category', cat);
    if (q) p.set('q', q);
    setParams(p);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilter({ q: draft.trim() });
    document.getElementById('places')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-content">
          <span className="pill pill-soft">📍 {t('heroBadge')}</span>
          <h1>{t('heroTitle')}</h1>
          <p className="hero-lead">{t('heroText')}</p>
          <form className="search" role="search" onSubmit={onSearch}>
            {Icon.search}
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
              maxLength={100}
            />
            <button className="btn btn-primary">{t('search')}</button>
          </form>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('categories')}</h2>
        {counts.error ? (
          <ErrorBox error={counts.error} onRetry={counts.reload} />
        ) : (
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat-tile${active === c.id ? ' is-active' : ''}`}
                style={hueStyle(c.id)}
                onClick={() => setFilter({ category: active === c.id ? null : c.id })}
              >
                <span className="cat-icon">{c.icon}</span>
                <span className="cat-name">{t(`cat_${c.id}`)}</span>
                <span className="cat-count">
                  {counts.data?.find((x) => x.id === c.id)?.venueCount ?? '…'} {t('places')}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section" id="places">
        <h2 className="section-title">{active ? t(`cat_${active}`) : t('allPlaces')}</h2>
        <div className="chips">
          <button type="button" className={`chip${active ? '' : ' is-active'}`} onClick={() => setFilter({ category: null })}>
            {t('allCategories')} <span>{total || ''}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`chip${active === c.id ? ' is-active' : ''}`}
              onClick={() => setFilter({ category: c.id })}
            >
              {c.icon} {t(`cat_${c.id}`)}
            </button>
          ))}
        </div>
        {venues.loading && !venues.data ? (
          <Loading />
        ) : venues.error ? (
          <ErrorBox error={venues.error} onRetry={venues.reload} />
        ) : venues.data && venues.data.length > 0 ? (
          <div className="venue-grid">
            {venues.data.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        ) : (
          <Empty>{t('nothingFound')}</Empty>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">{t('howItWorks')}</h2>
        <div className="steps">
          {([1, 2, 3] as const).map((n) => (
            <div className="step" key={n}>
              <span className="step-num">{n}</span>
              <h3>{t(`step${n}Title`)}</h3>
              <p>{t(`step${n}`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
