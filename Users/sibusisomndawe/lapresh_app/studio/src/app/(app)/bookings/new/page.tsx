
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import BookingForm, { type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, User, BookingDoc, LocationDoc, HairdresserDoc, ClientDoc } from "@/lib/types";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, addDoc, getDocs, serverTimestamp, Timestamp, query, where, updateDoc, doc, writeBatch, orderBy } from "@/lib/firebase";
import { increment } from "firebase/firestore"; // Import increment directly
import { format, addMinutes, isSameDay } from 'date-fns';

async function createOrUpdateClient(
  clientData: Pick<BookingFormValues, 'clientName' | 'clientPhone' | 'clientEmail'>
): Promise<string> {
  const clientsRef = collection(db, "clients");
  const q = query(clientsRef, where("phone", "==", clientData.clientPhone));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    // Client does not exist, create new one
    const newClientDoc: Omit<ClientDoc, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
      name: clientData.clientName,
      name_lowercase: clientData.clientName.toLowerCase(),
      phone: clientData.clientPhone,
      email: clientData.clientEmail || "",
      notes: "",
      firstSeen: serverTimestamp() as Timestamp,
      lastSeen: serverTimestamp() as Timestamp,
      totalBookings: 1,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    const docRef = await addDoc(clientsRef, newClientDoc);
    return docRef.id;
  } else {
    // Client exists, update lastSeen and totalBookings
    const existingClientDoc = querySnapshot.docs[0];
    const clientRef = doc(db, "clients", existingClientDoc.id);
    await updateDoc(clientRef, {
      lastSeen: serverTimestamp() as Timestamp,
      totalBookings: increment(1),
      name: clientData.clientName, 
      name_lowercase: clientData.clientName.toLowerCase(),
      email: clientData.clientEmail || existingClientDoc.data().email,
      updatedAt: serverTimestamp() as Timestamp,
    });
    return existingClientDoc.id;
  }
}


async function createBookingInFirestore(data: BookingFormValues, currentUser: User | null): Promise<string> {
  if (!currentUser) {
    toast({ title: "Authentication Error", description: "You must be logged in to create a booking.", variant: "destructive" });
    throw new Error("User not authenticated.");
  }

  const newAppointmentStart = data.appointmentDateTime; 
  const newAppointmentEnd = addMinutes(newAppointmentStart, data.durationMinutes);

  const bookingsRef = collection(db, "bookings");
  // SIMPLER QUERY: Only filter by hairdresser to avoid complex index/data type issues on date field.
  const q = query(
    bookingsRef,
    where("hairdresserId", "==", data.hairdresserId)
  );

  try {
    const querySnapshot = await getDocs(q);
    
    // Perform date and conflict checks on the client side for robustness
    for (const docSnap of querySnapshot.docs) {
      const existingBookingData = docSnap.data() as BookingDoc;
      if (existingBookingData.status === 'Cancelled') continue;

      let existingAppointmentStart: Date;
      const rawDate = existingBookingData.appointmentDateTime;

      if (rawDate && typeof (rawDate as any).toDate === 'function') {
        existingAppointmentStart = (rawDate as Timestamp).toDate();
      } else if (rawDate) {
        // Handle string or other formats
        existingAppointmentStart = new Date(rawDate.toString());
      } else {
        console.warn("Booking has no appointmentDateTime during final validation:", docSnap.id);
        continue;
      }
      
      // Check if the date is valid and on the same day as the new booking
      if (isNaN(existingAppointmentStart.getTime()) || !isSameDay(existingAppointmentStart, newAppointmentStart)) {
          continue;
      }

      const existingAppointmentEnd = addMinutes(existingAppointmentStart, existingBookingData.durationMinutes);
      
      if (newAppointmentStart < existingAppointmentEnd && newAppointmentEnd > existingAppointmentStart) {
        const errorMessage = `Booking conflict: This hairdresser is already booked from ${format(existingAppointmentStart, "HH:mm")} to ${format(existingAppointmentEnd, "HH:mm")} on ${format(existingAppointmentStart, "MMM dd, yyyy")}. Please choose a different time or hairdresser.`;
        toast({ title: "Booking Conflict", description: errorMessage, variant: "destructive", duration: 7000 });
        throw new Error(errorMessage);
      }
    }
  } catch (error: any) {
    if (error.message.startsWith("Booking conflict:")) throw error;
    console.error("Error fetching existing bookings for double-booking check:", error);
    toast({ title: "Error Checking Availability", description: "Could not verify hairdresser availability.", variant: "destructive" });
    throw new Error("Failed to check for existing bookings.");
  }

  let clientId = "";
  try {
    clientId = await createOrUpdateClient({
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail,
    });
  } catch (error: any) {
    console.error("Error creating/updating client record:", error);
    toast({ title: "Client Record Error", description: "Could not save client information. Booking not created.", variant: "destructive" });
    throw new Error("Failed to manage client record.");
  }

  const appointmentDateForFirestore = Timestamp.fromDate(data.appointmentDateTime);
  const newBookingDoc: Omit<BookingDoc, 'id'> = {
    clientName: data.clientName,
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone,
    clientId: clientId, 
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
      if (!(error instanceof Error && (error.message.startsWith("Booking conflict:") || error.message.startsWith("Failed to check") || error.message.startsWith("Failed to manage client record")))) {
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
