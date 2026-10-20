// The single service interface the UI uses. Implemented by mockService and httpService.
import type {
  Block,
  Booking,
  CategoryCount,
  CategoryId,
  CodeRequest,
  Lang,
  Schedule,
  Session,
  SlotRef,
  User,
  Venue,
  VenueSettings,
  VenueSummary,
} from './types';

export interface VenueFilter {
  category?: CategoryId | null;
  q?: string;
}

export interface BookingApi {
  /** Token used for authenticated calls; null when signed out. */
  setToken(token: string | null): void;

  listCategories(): Promise<CategoryCount[]>;
  listVenues(filter?: VenueFilter): Promise<VenueSummary[]>;
  getVenue(id: number): Promise<Venue>;
  getSchedule(venueId: number, date?: string): Promise<Schedule>;

  requestCode(phone: string): Promise<CodeRequest>;
  verifyCode(phone: string, code: string, name?: string): Promise<Session>;
  logout(): Promise<void>;
  me(): Promise<User>;
  updateMe(patch: { lang?: Lang; name?: string }): Promise<User>;

  createBooking(slot: SlotRef): Promise<Booking>;
  myBookings(): Promise<Booking[]>;
  cancelBooking(id: number): Promise<Booking>;

  ownerVenues(): Promise<VenueSummary[]>;
  ownerSchedule(venueId: number, date?: string): Promise<Schedule>;
  confirmBooking(id: number): Promise<Booking>;
  blockSlot(slot: SlotRef): Promise<Block>;
  unblockSlot(blockId: number): Promise<void>;
  updateVenueSettings(venueId: number, settings: VenueSettings): Promise<VenueSummary>;
}
