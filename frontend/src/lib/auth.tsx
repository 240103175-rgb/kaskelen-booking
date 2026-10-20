import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApi } from '../services/ApiContext';
import type { Session, User } from '../services/types';
import { useI18n } from './i18n';

const STORAGE_KEY = 'kb_token';

interface AuthValue {
  user: User | null;
  /** True until the stored token has been checked. */
  checking: boolean;
  signIn(session: Session): void;
  signOut(): Promise<void>;
  setUser(user: User): void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => Boolean(readToken()));

  useEffect(() => {
    const token = readToken();
    if (!token) return;
    api.setToken(token);
    api
      .me()
      .then(setUser)
      .catch(() => {
        api.setToken(null);
        writeToken(null);
      })
      .finally(() => setChecking(false));
  }, [api]);

  const signIn = useCallback(
    (session: Session) => {
      api.setToken(session.token);
      writeToken(session.token);
      setUser(session.user);
    },
    [api],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      writeToken(null);
      setUser(null);
    }
  }, [api]);

  useEffect(() => {
    if (user) setLang(user.lang);
    // Only when the signed-in user changes, not on every language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo(() => ({ user, checking, signIn, signOut, setUser }), [user, checking, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth outside AuthProvider');
  return value;
}

export const isOwner = (user: User | null) => user?.role === 'owner' || user?.role === 'admin';
