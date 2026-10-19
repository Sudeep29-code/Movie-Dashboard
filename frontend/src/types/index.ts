export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'student' | 'teacher' | 'admin' | 'super_admin';
  batch_id?: number | null;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: 'student' | 'teacher' | 'admin' | 'super_admin';
  username: string;
  display_name: string;
  user_id: number;
}

export interface Movie {
  id: number;
  title: string;
  synopsis: string;
  poster_url?: string;
  trailer_url?: string;
  genre: string;
  duration_minutes: number;
  language: string;
  is_published: boolean;
}

export interface Screening {
  id: number;
  movie_id: number;
  screening_date: string;
  start_time: string;
  end_time: string;
  status: string;
  movie?: Movie;
}

export interface SeatInventory {
  id: number;
  seat_id: number;
  seat_label: string;
  row_label: string;
  seat_number: number;
  tier: string;
  status: 'available' | 'held' | 'booked' | 'blocked';
}

export interface BookingSeat {
  seat_id: number;
  seat_label: string;
  row_label: string;
  seat_number: number;
  tier: string;
}

export interface Booking {
  id: number;
  booking_reference: string;
  user_id: number;
  user_name?: string;
  screening_id: number;
  movie_title?: string;
  screening_date?: string;
  start_time?: string;
  status: string;
  created_at: string;
  seats: BookingSeat[];
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  target_all: boolean;
  created_at: string;
  is_read?: boolean;
}

export interface Batch {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  actor_username?: string;
  action: string;
  target_entity: string;
  target_id?: string;
  details?: string;
  timestamp: string;
}
