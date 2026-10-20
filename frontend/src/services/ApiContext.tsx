import { createContext, useContext, type ReactNode } from 'react';
import type { BookingApi } from './api';

const ApiContext = createContext<BookingApi | null>(null);

export function ApiProvider({ api, children }: { api: BookingApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): BookingApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi outside ApiProvider');
  return api;
}
