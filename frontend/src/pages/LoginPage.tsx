import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { errorKey } from '../lib/useAsync';
import { useToast } from '../lib/toast';
import { useApi } from '../services/ApiContext';
import type { CodeRequest } from '../services/types';

/** Only same-site paths are allowed as a redirect target. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function LoginPage() {
  const api = useApi();
  const { t } = useI18n();
  const { user, signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const next = safeNext(useSearchParams()[0].get('next'));
  const [phone, setPhone] = useState('');
  const [request, setRequest] = useState<CodeRequest | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user && !busy) return <Navigate to={next} replace />;

  const askCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setRequest(await api.requestCode(phone));
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api.verifyCode(request!.phone, code, name || undefined);
      signIn(session);
      toast('ok', t('ok_welcome'));
      navigate(next, { replace: true });
    } catch (err) {
      const key = errorKey(err);
      if (key === 'err_too_many_attempts') {
        setRequest(null);
        setCode('');
      }
      setError(t(key));
    } finally {
      setBusy(false);
    }
  };

  if (!request) {
    return (
      <section className="auth">
        <span className="auth-icon">👋</span>
        <h1>{t('login')}</h1>
        <p className="muted">{t('loginLead')}</p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <form className="form" onSubmit={askCode}>
          <label>
            {t('phone')}
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 701 234 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
              maxLength={20}
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('sending') : t('getCode')}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="auth">
      <span className="auth-icon">🔐</span>
      <h1>{t('login')}</h1>
      <p className="muted">{t('codeSent', { phone: request.phone })}</p>
      {request.devCode && <div className="notice">{t('devCode', { code: request.devCode })}</div>}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <form className="form" onSubmit={verify}>
        <label>
          {t('code')}
          <input
            className="code-input"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
        </label>
        <label>
          {t('yourName')}
          <input name="name" autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t('sending') : t('confirmLogin')}
        </button>
      </form>
      <button
        type="button"
        className="auth-alt link"
        onClick={() => {
          setRequest(null);
          setCode('');
          setError(null);
        }}
      >
        {t('otherNumber')}
      </button>
    </section>
  );
}
