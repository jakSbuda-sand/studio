
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, Booking, User } from "@/lib/types";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";

const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

// Ensure this mock data uses `assigned_locations`
const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", userId: "uid1", email: "alice@example.com", assigned_locations: ["1"], specialties: ["Cutting", "Coloring"], availability: "Mon-Fri 9am-5pm", working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]},
  { id: "h2", name: "Bob Johnson", userId: "uid2", email: "bob@example.com", assigned_locations: ["2", "1"], specialties: ["Styling", "Men's Cuts"], availability: "Tue-Sat 10am-6pm", working_days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
  { id: "h3", name: "Carol White", userId: "uid3", email: "carol@example.com", assigned_locations: ["1"], specialties: ["Extensions", "Bridal Hair"], availability: "Wed-Sun 11am-7pm", working_days: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  { id: "h4", name: "David Brown", userId: "uid4", email: "david@example.com", assigned_locations: ["2"], specialties: ["Perms", "Treatments"], availability: "Mon, Wed, Fri 10am-7pm", working_days: ["Monday", "Wednesday", "Friday"] },
];


async function createBookingAction(data: BookingFormValues, currentUser: User | null): Promise<Booking> {
  console.log("Creating booking:", data);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newBooking: Booking = {
    id: Math.random().toString(36).substr(2, 9),
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    salonId: data.salonId, // Salon where booking is made
    hairdresserId: data.hairdresserId,
    service: data.service,
    appointmentDateTime: data.appointmentDateTime,
    durationMinutes: data.durationMinutes,
    status: 'Confirmed',
    notes: data.notes,
  };
  // This needs to be communicated to the BookingsPage, typically via API state update.
  // For mock, we'd need a shared mutable reference or event system.
  // For now, we rely on redirection and potential re-fetch/re-render logic on BookingsPage.
  toast({ title: "Booking Created", description: `Appointment for ${data.clientName} has been successfully scheduled.` });
  return newBooking;
}


export default function NewBookingPage() {
  const { user } = useAuth();
  const [salons] = useState<Salon[]>(mockSalonsData);
  const [hairdressers] = useState<Hairdresser[]>(mockHairdressersData);
  const router = useRouter();

  const handleCreateBooking = async (data: BookingFormValues) => {
    try {
      await createBookingAction(data, user);
      router.push(user?.role === 'hairdresser' ? '/bookings?view=mine' : '/bookings');
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast({
        title: "Booking Failed",
        description: "Could not create the booking. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Pre-fill form if hairdresser is creating a booking for themselves
  const initialFormValues: Partial<BookingFormValues> = {};
  if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
    initialFormValues.hairdresserId = user.hairdresserProfileId;
    // Pre-select the first salon the hairdresser is assigned to, if any
    const hairdresserDetails = mockHairdressersData.find(h => h.id === user.hairdresserProfileId);
    if (hairdresserDetails && hairdresserDetails.assigned_locations.length > 0) {
      initialFormValues.salonId = hairdresserDetails.assigned_locations[0];
    }
  }


  if (!user) return <p>Loading or redirecting...</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Booking"
        description="Schedule a new appointment for a client."
        icon={PlusCircle}
      />
      <BookingForm
        salons={salons}
        allHairdressers={hairdressers}
        onSubmit={handleCreateBooking}
        initialDataPreselected={initialFormValues}
      />
    </div>
  );
}
