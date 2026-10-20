import type { RetraceApi } from './api';
import { createMockService } from './mockService';

/** Data source. Iteration 1: the in-browser mock only. */
export const API_MODE: 'mock' | 'http' = 'mock';

export function createApi(): RetraceApi {
  return createMockService();
}
