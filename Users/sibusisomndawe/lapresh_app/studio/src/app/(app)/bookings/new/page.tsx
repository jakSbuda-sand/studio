
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

async function createBookingInFirestore(data: BookingFormValues, currentUser: User | null): Promise<string> {
  if (!currentUser) {
    toast({ title: "Authentication Error", description: "You must be logged in to create a booking.", variant: "destructive" });
    throw new Error("User not authenticated.");
  }

  const appointmentDateForFirestore = Timestamp.fromDate(data.appointmentDateTime);

  const newBookingDoc: Omit<BookingDoc, 'id'> = {
    clientName: data.clientName,
    clientEmail: data.clientEmail || "",
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: data.hairdresserId,
    serviceId: data.serviceId, // Changed from service to serviceId
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
  // Services state removed, BookingForm will fetch its own services
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
    } catch (error) {
      // Error toast handled in createBookingInFirestore
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
