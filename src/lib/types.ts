
import type { Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface DailyWorkingHours {
  start: string; // HH:mm format
  end: string; // HH:mm format
  isOff: boolean; // True if the hairdresser is off on this day
}

export type HairdresserWorkingHours = Partial<Record<DayOfWeek, DailyWorkingHours>>;


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
  assignedLocations: string[];
  specialties: string[];
  workingDays: DayOfWeek[];
  workingHours?: HairdresserWorkingHours;
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
  salonIds: string[];
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientId?: string; // Firestore ID of the client from 'clients' collection
  salonId: string;
  hairdresserId: string;
  serviceId: string;
  serviceName?: string;
  appointmentDateTime: Date;
  durationMinutes: number;
  price?: number; // Price of the service at time of booking
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show';
  notes?: string;
  color?: string;
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

// Represents a client in the UI
export interface Client {
  id: string; // Firestore document ID from 'clients' collection
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  firstSeen?: Timestamp; // Timestamp from Firestore
  lastSeen?: Timestamp;  // Timestamp from Firestore
  totalBookings: number;
}


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
  salonIds: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HairdresserDoc {
  name: string;
  email: string;
  userId: string;
  assignedLocations: string[];
  workingDays: DayOfWeek[];
  workingHours?: HairdresserWorkingHours;
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
  clientId?: string; // Firestore ID of the client from 'clients' collection
  salonId: string;
  hairdresserId: string;
  serviceId: string;
  appointmentDateTime: Timestamp;
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show';
  notes?: string;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDoc {
  name: string;
  email: string;
  role: 'admin' | 'hairdresser';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClientDoc {
  name: string;
  name_lowercase: string;
  phone: string;
  email?: string;
  notes?: string;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  totalBookings: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
