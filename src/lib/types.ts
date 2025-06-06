export interface Salon {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string; // e.g., "Mon-Fri: 9am-7pm, Sat: 10am-5pm"
}

export interface Hairdresser {
  id: string; // This will be hairdresserProfileId for User type
  name: string;
  salonId: string;
  specialties: string[]; // e.g., ["Cutting", "Coloring", "Styling"]
  availability: string; // Simplified for form: "Mon-Fri 9am-5pm, Sat 10am-2pm"
  profilePictureUrl?: string;
  email?: string; // For linking with User
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  salonId: string;
  hairdresserId: string;
  service: string;
  appointmentDateTime: Date;
  durationMinutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  color?: string; // For calendar color-coding
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'hairdresser';
  avatarUrl?: string;
  hairdresserProfileId?: string; // Links to Hairdresser.id if role is 'hairdresser'
  // password property is intentionally omitted from the type shared with client components
  // It will be handled within the AuthContext for mock purposes
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export type HairdresserAvailability = Partial<Record<DayOfWeek, AvailabilitySlot | null>>;
