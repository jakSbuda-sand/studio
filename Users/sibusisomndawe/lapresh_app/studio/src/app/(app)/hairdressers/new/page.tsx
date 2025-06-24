
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Salon, DayOfWeek, HairdresserDoc, LocationDoc, User, HairdresserWorkingHours } from "@/lib/types"; // Added User
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { functions, db, httpsCallable, collection, getDocs, Timestamp } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext"; // Added useAuth

// Function to generate a temporary password if not provided by user
const generateTemporaryPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

// Define the expected data structure for the callable function
interface CreateHairdresserFunctionData {
  email: string;
  password?: string;
  displayName: string;
  assigned_locations: string[];
  working_days: DayOfWeek[];
  workingHours?: HairdresserWorkingHours;
  specialties?: string[];
  profilePictureUrl?: string;
}


export default function NewHairdresserPage() {
  const { user } = useAuth(); // Get current user for role check
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSalons, setIsFetchingSalons] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({ title: "Access Denied", description: "You don't have permission to add hairdressers.", variant: "destructive" });
      router.replace('/dashboard');
      return;
    }

    const fetchSalons = async () => {
      setIsFetchingSalons(true);
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const locationsList = locationSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as LocationDoc)
        } as Salon));
        setSalons(locationsList);
      } catch (error: any) {
        console.error("Detailed error fetching salons: ", error, JSON.stringify(error, Object.getOwnPropertyNames(error)));
        toast({ title: "Error Fetching Salons", description: "Could not load salon data. " + error.message, variant: "destructive" });
      } finally {
        setIsFetchingSalons(false);
      }
    };
    if (user && user.role === 'admin'){ // Only fetch if admin
        fetchSalons();
    } else if (!user) {
        // Still loading user, or user not logged in. Handled by AuthContext or AppLayout.
        // If not admin and user is loaded, previous check handles it.
    }
  }, [user, router]);

  const handleAddHairdresser = async (data: HairdresserFormValues) => {
    if (user?.role !== 'admin') {
        toast({ title: "Permission Denied", description: "You are not authorized to perform this action.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    const tempPassword = data.initialPassword || generateTemporaryPassword();
    
    // Derive working_days from the structured workingHours
    const workingDays: DayOfWeek[] = [];
    if (data.workingHours) {
        for (const day in data.workingHours) {
            if (data.workingHours[day as DayOfWeek]?.isOff === false) {
                workingDays.push(day as DayOfWeek);
            }
        }
    }

    const hairdresserDataForFunction: CreateHairdresserFunctionData = {
      email: data.email,
      password: tempPassword,
      displayName: data.name,
      assigned_locations: data.assigned_locations,
      working_days: workingDays,
      workingHours: data.workingHours,
      specialties: data.specialties.split(",").map(s => s.trim()).filter(s => s),
      profilePictureUrl: data.profilePictureUrl || undefined,
    };

    try {
      const createHairdresserUser = httpsCallable<CreateHairdresserFunctionData, { status: string; userId: string; message: string }>(functions, 'createHairdresserUser');
      const result = await createHairdresserUser(hairdresserDataForFunction);
      
      toast({ title: "Hairdresser Added", description: result.data.message });
      router.push("/hairdressers");

    } catch (error: any) {
      console.error("Detailed error calling createHairdresserUser function:", error, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      toast({ title: "Error Adding Hairdresser", description: error.message || "Could not add hairdresser.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user && !isFetchingSalons) { // If user is null and not fetching salons, means auth check completed.
    // This case might be covered by AppLayout redirect, but as a fallback:
    return <p>Loading or redirecting...</p>;
  }
  
  if (user && user.role !== 'admin' && !isFetchingSalons) {
    // Already handled by useEffect, but good for clarity if rendering proceeds
    return <p>Access Denied. Redirecting...</p>;
  }


  if (isFetchingSalons || (user === null && user?.role !== 'admin')) { // if fetching or user is not loaded/not admin
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Hairdresser"
        description="Fill in the details to add a new member to your team."
        icon={UserPlus}
      />
      <HairdresserForm
        salons={salons}
        onSubmit={handleAddHairdresser}
        isEditing={false}
        isLoading={isLoading}
      />
    </div>
  );
}
