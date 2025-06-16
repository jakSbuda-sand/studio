
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, User, BookingDoc, LocationDoc, HairdresserDoc, Service, ServiceDoc } from "@/lib/types";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, addDoc, getDocs, serverTimestamp, Timestamp, query, where } from "@/lib/firebase";
import { format } from 'date-fns';

async function createBookingInFirestore(data: BookingFormValues, currentUser: User | null): Promise<string> {
  if (!currentUser) {
    toast({ title: "Authentication Error", description: "You must be logged in to create a booking.", variant: "destructive" });
    throw new Error("User not authenticated.");
  }

  // Double-booking prevention logic
  const newAppointmentStart = data.appointmentDateTime; // This is a JS Date
  const newAppointmentEnd = new Date(newAppointmentStart.getTime() + data.durationMinutes * 60000);

  // Query for potentially conflicting bookings for the hairdresser on the same day
  const dayStart = new Date(newAppointmentStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newAppointmentStart);
  dayEnd.setHours(23, 59, 59, 999);

  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("hairdresserId", "==", data.hairdresserId),
    where("status", "in", ["Confirmed", "Pending"]),
    where("appointmentDateTime", ">=", Timestamp.fromDate(dayStart)),
    where("appointmentDateTime", "<=", Timestamp.fromDate(dayEnd))
  );

  try {
    const querySnapshot = await getDocs(q);
    for (const docSnap of querySnapshot.docs) {
      const existingBookingData = docSnap.data() as BookingDoc;
      // Ensure existingBookingData.appointmentDateTime is treated as a Timestamp from Firestore
      let existingAppointmentStart: Date;
      if (existingBookingData.appointmentDateTime instanceof Timestamp) {
        existingAppointmentStart = existingBookingData.appointmentDateTime.toDate();
      } else if (typeof existingBookingData.appointmentDateTime === 'string') {
        existingAppointmentStart = new Date(existingBookingData.appointmentDateTime);
      } else {
        // Fallback or error if the type is unexpected, though Firestore typically returns Timestamps
        existingAppointmentStart = new Date(existingBookingData.appointmentDateTime);
      }
      
      const existingAppointmentEnd = new Date(existingAppointmentStart.getTime() + existingBookingData.durationMinutes * 60000);

      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (newAppointmentStart < existingAppointmentEnd && newAppointmentEnd > existingAppointmentStart) {
        const errorMessage = `Booking conflict: This hairdresser is already booked from ${format(existingAppointmentStart, "HH:mm")} to ${format(existingAppointmentEnd, "HH:mm")} on ${format(existingAppointmentStart, "MMM dd, yyyy")}. Please choose a different time or hairdresser.`;
        toast({ title: "Booking Conflict", description: errorMessage, variant: "destructive", duration: 7000 });
        throw new Error(errorMessage);
      }
    }
  } catch (error: any) {
    // If error is from the overlap check, rethrow it
    if (error.message.startsWith("Booking conflict:")) {
      throw error;
    }
    // Otherwise, it's an error fetching bookings, log and potentially rethrow or handle
    console.error("Error fetching existing bookings for double-booking check:", error);
    toast({ title: "Error Checking Availability", description: "Could not verify hairdresser availability. Please try again.", variant: "destructive" });
    throw new Error("Failed to check for existing bookings.");
  }

  // If no overlap, proceed to create the booking
  const appointmentDateForFirestore = Timestamp.fromDate(data.appointmentDateTime);

  const newBookingDoc: Omit<BookingDoc, 'id'> = {
    clientName: data.clientName,
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: data.hairdresserId,
    serviceId: data.serviceId, 
    appointmentDateTime: appointmentDateForFirestore,
    durationMinutes: data.durationMinutes,
    status: 'Confirmed', 
    notes: data.notes || "",
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    if (!db) throw new Error("Firestore DB instance not available.");
    const docRef = await addDoc(collection(db, "bookings"), newBookingDoc);
    toast({ title: "Booking Created", description: `Appointment for ${data.clientName} has been successfully scheduled.` });
    return docRef.id;
  } catch (error: any) {
    console.error("Error writing booking document to Firestore:", error);
    toast({ title: "Booking Creation Failed", description: `Could not save booking: ${error.message}.`, variant: "destructive" });
    throw error;
  }
}


export default function NewBookingPage() {
  const { user } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [initialFormValues, setInitialFormValues] = useState<Partial<BookingFormValues>>({});


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({ id: sDoc.id, ...(sDoc.data() as LocationDoc) } as Salon));
        setSalons(salonsList);

        const hairdressersCol = collection(db, "hairdressers");
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => {
          const data = hDoc.data() as HairdresserDoc;
          return {
            id: hDoc.id, userId: data.user_id, name: data.name, email: data.email,
            assigned_locations: data.assigned_locations || [], specialties: data.specialties || [],
            availability: data.availability || "", working_days: data.working_days || [],
            workingHours: data.workingHours || {},
            profilePictureUrl: data.profilePictureUrl || "", must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt, updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        setHairdressers(hairdressersList);

        const prefillValues: Partial<BookingFormValues> = {};
        if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
            prefillValues.hairdresserId = user.hairdresserProfileId;
            const hairdresserDetails = hairdressersList.find(h => h.id === user.hairdresserProfileId);
            if (hairdresserDetails && hairdresserDetails.assigned_locations.length > 0) {
                prefillValues.salonId = hairdresserDetails.assigned_locations[0];
            }
        }
        setInitialFormValues(prefillValues);

      } catch (error: any) {
        console.error("Error fetching data for new booking:", error);
        toast({ title: "Error Loading Data", description: `Could not load required data: ${error.message}.`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCreateBooking = async (data: BookingFormValues) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    setIsSubmitting(true);
    try {
      await createBookingInFirestore(data, user);
      router.push(user?.role === 'hairdresser' ? '/bookings?view=mine' : '/bookings');
    } catch (error: any) {
      // Error toast is handled within createBookingInFirestore for overlap errors
      // or by the catch block in createBookingInFirestore for other Firestore errors.
      // If it's a generic error from createBookingInFirestore not related to toasts, log it.
      if (!(error instanceof Error && (error.message.startsWith("Booking conflict:") || error.message.startsWith("Failed to check")))) {
        console.error("Error during booking creation process:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-body">Loading booking form...</span>
      </div>
    );
  }

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
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
