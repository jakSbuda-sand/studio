
import type { Timestamp } from 'firebase/firestore';

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string; // e.g., "Mon-Fri: 9am-7pm, Sat: 10am-5pm"
  // Firestore specific fields if different:
  // name_lowercase?: string; // For case-insensitive search
}

export interface Hairdresser {
  // This type is used by the frontend components.
  // It might be a combination of data from HairdresserDoc and UserDoc.
  id: string; // Firestore document ID from 'hairdressers' collection
  userId: string; // Firebase Auth UID
  name: string;
  email: string;
  salonId: string; // For frontend simplicity, might map to one of assigned_locations
  assigned_locations: string[]; // Array of location IDs (references to 'locations' collection)
  specialties: string[];
  availability: string; // Simplified for form
  working_days: DayOfWeek[];
  profilePictureUrl?: string;
  color_code: string; // Hex color for calendar
  must_reset_password?: boolean;
}

export interface Booking {
  id: string; // Firestore document ID
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string; // Reference to 'locations' doc ID
  hairdresserId: string; // Reference to 'hairdressers' doc ID (Auth UID or Firestore doc ID depending on decision)
  service: string; // Could map to style_id's name or be free text
  styleId?: string; // Reference to 'styles' doc ID
  appointmentDateTime: Date; // Combined date and time for client-side
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'; // Or use strings from BookingDoc
  notes?: string;
  color?: string; // For calendar color-coding on frontend
  price?: number;
  extras?: { length?: string; curls?: boolean; beads?: boolean; [key: string]: any; };
  deposit_paid?: boolean;
}

// User object used in AuthContext and frontend components
export interface User {
  uid: string; // Firebase Auth UID
  name: string | null;
  email: string | null;
  role: 'admin' | 'hairdresser' | 'unknown'; // Role fetched from 'users' collection
  avatarUrl?: string;
  // If hairdresser, this links to their profile in 'hairdressers' collection.
  // This could be the Auth UID itself if user_id in 'hairdressers' is the Auth UID.
  hairdresserDocId?: string;
  must_reset_password?: boolean; // Specific to hairdressers, fetched from 'hairdressers' doc
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export type HairdresserAvailability = Partial<Record<DayOfWeek, AvailabilitySlot[] | null>>;


// --- Firestore Document Types ---

export interface LocationDoc {
  // id is the document ID
  name: string;
  active: boolean;
}

export interface HairdresserDoc {
  // id is the document ID (can be same as user_id or a unique ID)
  name: string;
  email: string; // Denormalized for easier querying/display
  user_id: string; // Firebase Auth UID, unique constraint
  assigned_locations: string[]; // Array of location IDs (references to 'locations' collection)
  working_days: DayOfWeek[]; // Array of strings like "Monday", "Tuesday"
  // role: string; // Role is primarily managed in 'users' collection for central role management.
                  // Redundant here unless specific hairdresser sub-roles are needed.
  color_code: string; // e.g., hex for calendar styling
  must_reset_password: boolean; // True if admin created, false after first password reset
  specialties?: string[]; // Added from previous type, good to have
  availability_schedule?: HairdresserAvailability; // More structured availability
  profilePictureUrl?: string; // Added from previous type
}

export interface StyleDoc {
  // id is the document ID
  name: string;
  duration_minutes: number;
  base_price: number;
  // description?: string;
  // category?: string;
}

export interface BookingDoc {
  // id is the document ID
  client_name: string;
  client_phone: string;
  client_email?: string; // Optional
  location_id: string; // Reference to 'locations' doc ID
  hairdresser_id: string; // Reference to 'hairdressers' doc ID (likely the Auth UID of hairdresser)
  style_id: string; // Reference to 'styles' doc ID
  extras: {
    length?: string; // e.g., "shoulder", "long"
    curls?: boolean;
    beads?: boolean;
    [key: string]: any; // Allows for other dynamic extras
  };
  price: number;
  date: Timestamp; // Firestore Timestamp for the appointment date (time part might be zeroed out)
  start_time: string; // e.g., "10:00" (24-hour format)
  end_time: string; // e.g., "11:30" (24-hour format)
  duration_minutes: number; // Added for convenience from StyleDoc, or if custom duration
  deposit_paid: boolean;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'; // More specific statuses
  notes?: string; // Client or staff notes
  created_at: Timestamp;
  updated_at: Timestamp;
  // created_by: string; // UID of user who created booking (admin or hairdresser)
}

export interface UserDoc {
  // id is the Firebase Auth UID
  name: string;
  email: string; // For easy lookup, should match Auth email
  role: 'admin' | 'hairdresser';
  // If role is 'hairdresser', this can link to the document ID in the 'hairdressers' collection
  // if the 'hairdressers' collection uses its own unique IDs.
  // If 'hairdressers' collection uses Auth UID as doc ID, this field is redundant.
  // For simplicity, let's assume 'hairdressers' collection uses Auth UID as doc ID.
  // hairdresser_profile_id?: string; // This would be the doc ID in 'hairdressers'
  created_at: Timestamp;
  // avatarUrl?: string; // Can be stored here or rely on Auth profile
}

export interface NotificationDoc {
  // id is the document ID
  booking_id: string; // Reference to 'bookings' doc ID
  type: 'email' | 'sms';
  recipient_email?: string;
  recipient_phone?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: Timestamp; // Set when successfully sent
  created_at: Timestamp;
  template_id?: string; // e.g., "booking_confirmation", "booking_reminder"
  // error_message?: string; // If sending failed
}

    