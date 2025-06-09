
import type { Timestamp } from 'firebase/firestore';

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string;
  createdAt?: Timestamp; // Should be Timestamp from Firestore
  updatedAt?: Timestamp; // Should be Timestamp from Firestore
}

export interface Hairdresser {
  id: string; // Firestore document ID from 'hairdressers' collection (should be same as userId)
  userId: string; // Firebase Auth UID
  name: string;
  email: string;
  assigned_locations: string[]; // Array of location IDs
  specialties: string[];
  availability: string; // Text description of availability
  working_days: DayOfWeek[]; // This might become redundant if 'availability' string is comprehensive
  profilePictureUrl?: string;
  must_reset_password?: boolean;
  // Firestore timestamps, converted to Date or string for UI if needed
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Booking {
  id: string; // Firestore document ID
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string; // Reference to 'locations' doc ID (salon where booking is made)
  hairdresserId: string; // Reference to 'hairdressers' doc ID
  service: string;
  styleId?: string;
  appointmentDateTime: Date;
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  color?: string;
  price?: number;
  extras?: { length?: string; curls?: boolean; beads?: boolean; [key: string]: any; };
  deposit_paid?: boolean;
}

export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'hairdresser' | 'unknown';
  avatarUrl?: string;
  hairdresserDocId?: string; // Firestore doc ID for the hairdresser profile (same as uid for hairdressers)
  hairdresserProfileId?: string; // Auth UID, used for linking (same as uid for hairdressers)
  must_reset_password?: boolean;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export type HairdresserAvailability = Partial<Record<DayOfWeek, AvailabilitySlot[] | null>>;


// --- Firestore Document Types ---

export interface LocationDoc {
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HairdresserDoc {
  name: string;
  email: string;
  user_id: string; // Auth UID
  assigned_locations: string[];
  working_days: DayOfWeek[]; // Consider if this is still primary or if 'availability' string is enough
  availability: string; // Text description like "Mon-Fri 9am-5pm"
  must_reset_password: boolean;
  specialties?: string[];
  // availability_schedule?: HairdresserAvailability; // Complex schedule object, if needed in future
  profilePictureUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StyleDoc {
  name: string;
  duration_minutes: number;
  base_price: number;
}

export interface BookingDoc {
  client_name: string;
  client_phone: string;
  client_email?: string;
  location_id: string;
  hairdresser_id: string;
  style_id: string;
  extras: {
    length?: string;
    curls?: boolean;
    beads?: boolean;
    [key: string]: any;
  };
  price: number;
  date: Timestamp;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  deposit_paid: boolean;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserDoc {
  name: string;
  email: string;
  role: 'admin' | 'hairdresser';
  created_at: Timestamp;
}

export interface NotificationDoc {
  booking_id: string;
  type: 'email' | 'sms';
  recipient_email?: string;
  recipient_phone?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: Timestamp;
  created_at: Timestamp;
  template_id?: string;
}
