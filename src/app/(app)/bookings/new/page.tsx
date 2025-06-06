
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, Booking } from "@/lib/types";
import { ClipboardList, PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

// Mock data - in a real app, this would come from an API
const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", salonId: "1", specialties: ["Cutting", "Coloring"], availability: "Mon-Fri 9am-5pm" },
  { id: "h2", name: "Bob Johnson", salonId: "2", specialties: ["Styling", "Men's Cuts"], availability: "Tue-Sat 10am-6pm" },
  { id: "h3", name: "Carol White", salonId: "1", specialties: ["Extensions", "Bridal Hair"], availability: "Wed-Sun 11am-7pm" },
  { id: "h4", name: "David Brown", salonId: "2", specialties: ["Perms", "Treatments"], availability: "Mon, Wed, Fri 10am-7pm" },
];

async function createBookingAction(data: BookingFormValues): Promise<Booking> {
  console.log("Creating booking:", data);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const newBooking: Booking = {
    id: Math.random().toString(36).substr(2, 9),
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: data.hairdresserId,
    service: data.service,
    appointmentDateTime: data.appointmentDateTime, // Already combined Date object
    durationMinutes: data.durationMinutes,
    status: 'Confirmed', // Default status for new booking
    notes: data.notes,
  };
  toast({ title: "Booking Created", description: `Appointment for ${data.clientName} has been successfully scheduled.` });
  return newBooking;
}


export default function NewBookingPage() {
  const [salons, setSalons] = useState<Salon[]>(mockSalonsData);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>(mockHairdressersData);
  const router = useRouter();

  // In a real app, fetch salons and hairdressers
  useEffect(() => {
    // fetchSalons().then(setSalons);
    // fetchHairdressers().then(setHairdressers);
  }, []);

  const handleCreateBooking = async (data: BookingFormValues) => {
    try {
      await createBookingAction(data);
      // Optionally redirect to bookings list or calendar
      router.push('/bookings');
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast({
        title: "Booking Failed",
        description: "Could not create the booking. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      />
    </div>
  );
}
