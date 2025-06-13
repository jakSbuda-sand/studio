
import type { Timestamp } from 'firebase/firestore';

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string;
  createdAt?: Timestamp; 
  updatedAt?: Timestamp; 
}

export interface Hairdresser {
  id: string; 
  userId: string; 
  name: string;
  email: string;
  assigned_locations: string[]; 
  specialties: string[];
  availability: string; 
  working_days: DayOfWeek[]; 
  profilePictureUrl?: string;
  must_reset_password?: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number; // Price in Rands
  salonId: string;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Booking {
  id: string; 
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string;
  hairdresserId: string;
  serviceId: string; // Changed from service: string
  serviceName?: string; // For display purposes
  appointmentDateTime: Date; // In-app representation
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  color?: string; // For calendar event coloring
  createdAt?: Timestamp; 
  updatedAt?: Timestamp; 
}

export interface User {
  uid: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'hairdresser' | 'unknown';
  avatarUrl?: string;
  hairdresserDocId?: string; 
  hairdresserProfileId?: string; 
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

export interface ServiceDoc {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  salonId: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HairdresserDoc {
  name: string;
  email: string;
  user_id: string; 
  assigned_locations: string[];
  working_days: DayOfWeek[]; 
  availability: string; 
  must_reset_password: boolean;
  specialties?: string[];
  profilePictureUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingDoc {
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string;
  hairdresserId: string;
  serviceId: string; // Changed from service: string
  appointmentDateTime: Timestamp;
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  color?: string; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

    