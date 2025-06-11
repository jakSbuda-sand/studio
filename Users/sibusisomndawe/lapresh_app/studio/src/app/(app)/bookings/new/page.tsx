
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Salon, Hairdresser, User, BookingDoc, LocationDoc, HairdresserDoc } from "@/lib/types";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, addDoc, getDocs, serverTimestamp, Timestamp } from "@/lib/firebase";

async function createBookingInFirestore(data: BookingFormValues, currentUser: User | null): Promise<string> {
  console.log("Creating booking in Firestore (NewBookingPage):", data);
  
  const [hours, minutes] = data.appointmentTime.split(':').map(Number);
  const combinedDateTime = new Date(data.appointmentDateTime);
  combinedDateTime.setHours(hours, minutes, 0, 0);

  const newBookingDoc: Omit<BookingDoc, 'id'> = {
    clientName: data.clientName,
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: data.hairdresserId,
    service: data.service,
    appointmentDateTime: Timestamp.fromDate(combinedDateTime),
    durationMinutes: data.durationMinutes,
    status: 'Confirmed', 
    notes: data.notes || "",
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, "bookings"), newBookingDoc);
    toast({ title: "Booking Created", description: `Appointment for ${data.clientName} has been successfully scheduled.` });
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating booking in Firestore (NewBookingPage):", error);
    toast({ title: "Booking Creation Failed", description: error.message, variant: "destructive" });
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
    console.log("[NewBookingPage] useEffect triggered. User:", user);
    if (!user) {
      console.log("[NewBookingPage] No user, skipping data fetch.");
      setIsLoading(false); 
      return;
    }

    const fetchData = async () => {
      console.log("[NewBookingPage] fetchData started.");
      setIsLoading(true);
      try {
        console.log("[NewBookingPage] Fetching salons...");
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({ 
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        console.log(`[NewBookingPage] Fetched ${salonsList.length} salons:`, salonsList);
        setSalons(salonsList);

        console.log("[NewBookingPage] Fetching hairdressers...");
        const hairdressersCol = collection(db, "hairdressers");
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        console.log(`[NewBookingPage] Hairdresser snapshot has ${hairdresserSnapshot.docs.length} documents.`);
        
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => {
          const data = hDoc.data() as HairdresserDoc;
          console.log(`[NewBookingPage] Mapping hairdresser doc ${hDoc.id}:`, data);
          return {
            id: hDoc.id,
            userId: data.user_id,
            name: data.name,
            email: data.email,
            assigned_locations: data.assigned_locations || [],
            specialties: data.specialties || [],
            availability: data.availability || "",
            working_days: data.working_days || [],
            profilePictureUrl: data.profilePictureUrl || "",
            must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        console.log(`[NewBookingPage] Mapped ${hairdressersList.length} hairdressers:`, hairdressersList);
        setHairdressers(hairdressersList);
        
        const prefillValues: Partial<BookingFormValues> = {};
        if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
            console.log("[NewBookingPage] User is hairdresser, attempting to prefill form.");
            prefillValues.hairdresserId = user.hairdresserProfileId;
            const hairdresserDetails = hairdressersList.find(h => h.id === user.hairdresserProfileId);
            if (hairdresserDetails && hairdresserDetails.assigned_locations.length > 0) {
                prefillValues.salonId = hairdresserDetails.assigned_locations[0];
                console.log("[NewBookingPage] Prefilling salonId:", hairdresserDetails.assigned_locations[0]);
            }
            console.log("[NewBookingPage] Prefill values for hairdresser:", prefillValues);
        }
        setInitialFormValues(prefillValues);

      } catch (error: any) {
        console.error("[NewBookingPage] Error fetching data for new booking:", error);
        toast({ title: "Error Loading Data", description: `Could not load required data: ${error.message}. Check console for details.`, variant: "destructive" });
      } finally {
        console.log("[NewBookingPage] fetchData finished.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCreateBooking = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    try {
      await createBookingInFirestore(data, user);
      router.push(user?.role === 'hairdresser' ? '/bookings?view=mine' : '/bookings');
    } catch (error) {
      // Toast is handled by createBookingInFirestore
      console.error("[NewBookingPage] Failed to create booking (handled by action):", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading booking form...</span>
      </div>
    );
  }

  if (!user && !isLoading) {
    // This case should ideally be handled by AppLayout redirecting.
    // However, if reached, provide a clear message.
    return (
        <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Please log in to create a booking. Redirecting...</p>
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
        isSubmitting={isSubmitting} // Pass submission state to form
      />
    </div>
  );
}

