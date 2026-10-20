import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout, Loading } from './components/ui';
import { AuthProvider, isOwner, useAuth } from './lib/auth';
import { I18nProvider, useI18n } from './lib/i18n';
import { ToastProvider } from './lib/toast';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OwnerPage } from './pages/OwnerPage';
import { SettingsPage } from './pages/SettingsPage';
import { VenuePage } from './pages/VenuePage';
import type { BookingApi } from './services/api';
import { ApiProvider } from './services/ApiContext';

function RequireUser({ owner = false, children }: { owner?: boolean; children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (owner && !isOwner(user)) return <NotFound />;
  return <>{children}</>;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <section className="auth">
      <span className="auth-icon">🔍</span>
      <h1>{t('notFound')}</h1>
    </section>
  );
}

export function AppRoutes({ mock }: { mock: boolean }) {
  return (
    <Layout mock={mock}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/venues/:id" element={<VenuePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/me" element={<RequireUser><MyBookingsPage /></RequireUser>} />
        <Route path="/owner" element={<RequireUser owner><OwnerPage /></RequireUser>} />
        <Route path="/owner/venues/:id/settings" element={<RequireUser owner><SettingsPage /></RequireUser>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export function App({ api, mock, router = true }: { api: BookingApi; mock: boolean; router?: boolean }) {
  const tree = (
    <ApiProvider api={api}>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes mock={mock} />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ApiProvider>
  );
  return router ? <BrowserRouter>{tree}</BrowserRouter> : tree;
}
