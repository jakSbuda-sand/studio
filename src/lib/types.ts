
import type { Timestamp } from 'firebase/firestore';

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string; // e.g., "Mon-Fri: 9am-7pm, Sat: 10am-5pm"
  active?: boolean; // Added for Firestore alignment
}

export interface Hairdresser {
  id: string; // This will be hairdresserProfileId for User type
  name: string;
  email: string; // Added for login and user creation
  salonId: string; // Current frontend type uses this
  assigned_locations?: string[]; // For Firestore alignment
  specialties: string[]; // e.g., ["Cutting", "Coloring", "Styling"]
  availability: string; // Simplified for form: "Mon-Fri 9am-5pm, Sat 10am-2pm"
  profilePictureUrl?: string;
  working_days?: string[]; // For Firestore alignment
  role?: string; // For Firestore alignment
  user_id?: string; // For Firestore alignment
  color_code?: string; // For Firestore alignment
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string; // Current frontend type
  location_id?: string; // For Firestore alignment (matches 'location' field in spec)
  hairdresserId: string;
  service: string; // Current frontend type
  style_id?: string; // For Firestore alignment
  appointmentDateTime: Date; // Current frontend type
  date?: Timestamp; // For Firestore alignment
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  color?: string; // For calendar color-coding

  // Fields for Firestore alignment if not directly mapped
  extras?: { length?: string; curls?: boolean; beads?: boolean; [key: string]: any; };
  price?: number;
  start_time?: string;
  end_time?: string;
  deposit_paid?: boolean;
}

export interface User {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  role: 'admin' | 'hairdresser';
  avatarUrl?: string;
  hairdresserProfileId?: string; // Links to Hairdresser.id if role is 'hairdresser'
  associated_hairdresser_id?: string; // For Firestore alignment
  needsPasswordChange?: boolean; // For forcing password change on first login
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export type HairdresserAvailability = Partial<Record<DayOfWeek, AvailabilitySlot | null>>;


// --- Firestore Document Types ---

export interface LocationDoc {
  name: string;
  active: boolean;
}

export interface HairdresserDoc {
  name: string;
  email: string; // Added for consistency
  assigned_locations: string[]; // Array of location IDs
  working_days: string[]; // e.g., ["Monday", "Tuesday"]
  role: string; // e.g., "hairdresser"
  user_id: string; // Firebase Auth UID
  color_code: string; // e.g., hex for calendar styling
}

export interface StyleDoc {
  name: string;
  duration_minutes: number;
  base_price: number;
}

export interface BookingDoc {
  client_name: string;
  client_phone: string;
  location_id: string; // Reference to location ID from 'locations' collection (Firestore field name 'location' as per spec)
  hairdresser_id: string; // Reference to hairdresser ID
  style_id: string; // Reference to style ID
  extras: {
    length?: string;
    curls?: boolean;
    beads?: boolean;
    [key: string]: any; // Allows for other dynamic extras
  };
  price: number;
  date: Timestamp; // Firestore Timestamp
  start_time: string; // e.g., "10:00"
  end_time: string; // e.g., "11:30"
  deposit_paid: boolean;
  status: string; // e.g., "confirmed", "completed", "canceled"
}

export interface UserDoc {
  name: string;
  email: string;
  role: string; // e.g., "admin", "hairdresser"
  associated_hairdresser_id?: string; // Optional: links to a document ID in 'hairdressers' collection
  needs_password_change?: boolean; // For Firestore
}

export interface NotificationDoc {
  booking_id: string;
  type: "email" | "sms";
  sent_at: Timestamp;
}
