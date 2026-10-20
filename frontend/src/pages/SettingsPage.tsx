import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Icon, Loading } from '../components/ui';
import { category } from '../lib/categories';
import { useI18n } from '../lib/i18n';
import { errorKey, useAsync } from '../lib/useAsync';
import { useToast } from '../lib/toast';
import { useApi } from '../services/ApiContext';
import type { VenueSettings } from '../services/types';

const FIELDS: { key: keyof VenueSettings; label: string; min: number; max: number; step?: number }[] = [
  { key: 'openHour', label: 'openHour', min: 0, max: 23 },
  { key: 'closeHour', label: 'closeHour', min: 1, max: 24 },
  { key: 'dayPrice', label: 'dayPrice', min: 0, max: 1_000_000, step: 500 },
  { key: 'eveningPrice', label: 'eveningPrice', min: 0, max: 1_000_000, step: 500 },
  { key: 'eveningStartHour', label: 'eveningStart', min: 0, max: 24 },
];

export function SettingsPage() {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const venueId = Number(useParams().id);
  const venues = useAsync(() => api.ownerVenues(), [api]);
  const venue = venues.data?.find((v) => v.id === venueId);
  const [form, setForm] = useState<Record<keyof VenueSettings, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venue && !form) {
      setForm({
        openHour: String(venue.openHour),
        closeHour: String(venue.closeHour),
        dayPrice: String(venue.dayPrice),
        eveningPrice: String(venue.eveningPrice),
        eveningStartHour: String(venue.eveningStartHour),
      });
    }
  }, [venue, form]);

  if (venues.error) return <ErrorBox error={venues.error} onRetry={venues.reload} />;
  if (!venues.data) return <Loading />;
  if (!venue) {
    return (
      <section className="auth">
        <span className="auth-icon">🔍</span>
        <h1>{t('notFound')}</h1>
      </section>
    );
  }
  if (!form) return <Loading />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const settings = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])) as unknown as VenueSettings;
      await api.updateVenueSettings(venue.id, settings);
      toast('ok', t('ok_saved'));
      navigate(`/owner?venue=${venue.id}`);
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Link className="back-link back-link-dark" to={`/owner?venue=${venue.id}`}>
        {Icon.arrow}
        {t('back')}
      </Link>
      <section className="auth auth-wide">
        <span className="auth-icon">{category(venue.category).icon}</span>
        <h1>{venue.name}</h1>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <form className="form form-grid" onSubmit={save} noValidate>
          {FIELDS.map((f) => (
            <label key={f.key}>
              {t(f.label)}
              <input
                name={f.key}
                type="number"
                min={f.min}
                max={f.max}
                step={f.step ?? 1}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                required
              />
            </label>
          ))}
          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </form>
      </section>
    </>
  );
}
