import type { BookingApi } from './api';
import { createMockService } from './mockService';

/** Which data source the UI uses: `mock` (in-browser demo data) or `http` (the real API). */
export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export function createApi(): BookingApi {
  return createMockService();
}
