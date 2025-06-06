
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, Booking, User } from "@/lib/types";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";

// Mock data - in a real app, this would come from an API
const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", salonId: "1", specialties: ["Cutting", "Coloring"], availability: "Mon-Fri 9am-5pm", email: "alice@salonverse.com" },
  { id: "h2", name: "Bob Johnson", salonId: "2", specialties: ["Styling", "Men's Cuts"], availability: "Tue-Sat 10am-6pm", email: "bob@salonverse.com" },
  { id: "h3", name: "Carol White", salonId: "1", specialties: ["Extensions", "Bridal Hair"], availability: "Wed-Sun 11am-7pm", email: "carol@salonverse.com" },
  { id: "h4", name: "David Brown", salonId: "2", specialties: ["Perms", "Treatments"], availability: "Mon, Wed, Fri 10am-7pm", email: "david@salonverse.com" },
];

// This should ideally be shared with bookings/page.tsx or fetched from a central store/API
let globalMockBookingsDataRefForNewPage: Booking[] = []; // This will be populated by a fetch or effect if needed

async function createBookingAction(data: BookingFormValues, currentUser: User | null): Promise<Booking> {
  console.log("Creating booking:", data);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let hairdresserIdToUse = data.hairdresserId;
  if (currentUser?.role === 'hairdresser' && currentUser.hairdresserProfileId) {
    // If a hairdresser is creating a booking, it should be for themselves,
    // unless the form explicitly allows them to choose (which it does).
    // For safety, one might enforce this or pre-fill. Current form allows choice.
    // If form doesn't pre-fill or lock, this check might be redundant or for logging.
    console.log(`Booking created by hairdresser ${currentUser.name} for ${mockHairdressersData.find(h=>h.id === data.hairdresserId)?.name || 'unknown'}`);
  }

  const newBooking: Booking = {
    id: Math.random().toString(36).substr(2, 9),
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: hairdresserIdToUse,
    service: data.service,
    appointmentDateTime: data.appointmentDateTime, // Already combined Date object
    durationMinutes: data.durationMinutes,
    status: 'Confirmed', // Default status for new booking
    notes: data.notes,
  };
  // Add to the global mock data if it's being used by other pages
  // globalMockBookingsDataRefForNewPage.push(newBooking);
  // For consistency with bookings/page.tsx, we need a way to update its source.
  // This is a limitation of mock data. In a real app, API would handle this.
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
      // To see the new booking on the /bookings page, we'd need to update its data source.
      // This is tricky with mock data isolated in components.
      // For now, redirect and user can see it if data source is somehow shared or re-fetched.
      // The bookings/page.tsx now uses a global let variable for mock data, so this should work if that page re-renders.
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
  
  const initialFormValues = user?.role === 'hairdresser' && user.hairdresserProfileId ? 
  { hairdresserId: user.hairdresserProfileId, salonId: mockHairdressersData.find(h => h.id === user.hairdresserProfileId)?.salonId || "" }
  : {};

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
        initialDataPreselected={initialFormValues} // Pass pre-selections
      />
    </div>
  );
}

