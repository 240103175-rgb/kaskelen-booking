// Types shared by the service interface, the mock and the HTTP client.
// They mirror the schemas in /openapi.yml.

export type Lang = 'kk' | 'ru';
export type Role = 'player' | 'owner' | 'admin';
export type CategoryId = 'football' | 'barbershop' | 'beauty' | 'massage' | 'pool' | 'sauna' | 'gym' | 'restaurant';
export type SlotStatus = 'free' | 'full' | 'blocked' | 'past';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type ErrorCode =
  | 'invalid_phone'
  | 'wrong_code'
  | 'too_many_attempts'
  | 'too_soon'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_slot'
  | 'past_slot'
  | 'blocked_slot'
  | 'taken'
  | 'already_booked'
  | 'too_late'
  | 'already_cancelled'
  | 'invalid_status'
  | 'invalid_settings'
  | 'hours_conflict'
  | 'validation_error'
  | 'network'
  | 'server_error';

export interface User {
  id: number;
  phone: string;
  name: string | null;
  role: Role;
  lang: Lang;
}

export interface CategoryCount {
  id: CategoryId;
  venueCount: number;
}

export interface VenueSummary {
  id: number;
  category: CategoryId;
  name: string;
  address: string;
  description: string | null;
  openHour: number;
  closeHour: number;
  dayPrice: number;
  eveningPrice: number;
  eveningStartHour: number;
  resourceCount: number;
}

export interface Resource {
  id: number;
  venueId: number;
  name: string;
  capacity: number;
}

export interface Venue extends VenueSummary {
  resources: Resource[];
}

/** A booking as the venue owner sees it inside a slot. */
export interface SlotBooking {
  id: number;
  status: BookingStatus;
  customerName: string | null;
  customerPhone: string;
}

export interface Slot {
  hour: number;
  startAt: string;
  price: number;
  status: SlotStatus;
  left: number;
  mine: boolean;
  blockId: number | null;
  /** Present only in the owner schedule. */
  bookings?: SlotBooking[];
}

export interface ResourceSchedule {
  resource: Resource;
  slots: Slot[];
}

export interface Schedule {
  venueId: number;
  date: string;
  today: string;
  maxDate: string;
  resources: ResourceSchedule[];
}

export interface Booking {
  id: number;
  resourceId: number;
  resourceName: string;
  venueId: number;
  venueName: string;
  venueAddress: string;
  category: CategoryId;
  startAt: string;
  date: string;
  hour: number;
  price: number;
  status: BookingStatus;
  createdAt: string;
}

export interface Block {
  id: number;
  resourceId: number;
  startAt: string;
}

export interface CodeRequest {
  phone: string;
  expiresInSeconds: number;
  /** Only outside production: the code itself, because no SMS is sent in the MVP. */
  devCode?: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface VenueSettings {
  openHour: number;
  closeHour: number;
  dayPrice: number;
  eveningPrice: number;
  eveningStartHour: number;
}

export interface SlotRef {
  resourceId: number;
  date: string;
  hour: number;
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    message: string = code,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
