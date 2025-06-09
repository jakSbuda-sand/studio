
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Salon, DayOfWeek, HairdresserDoc, LocationDoc } from "@/lib/types";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { functions, db, httpsCallable, collection, getDocs, Timestamp } from "@/lib/firebase"; // Import Timestamp

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
  availability: string; // Ensure this matches the function's expected input
  specialties?: string[];
  profilePictureUrl?: string;
}


export default function NewHairdresserPage() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSalons, setIsFetchingSalons] = useState(true);

  useEffect(() => {
    const fetchSalons = async () => {
      setIsFetchingSalons(true);
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const locationsList = locationSnapshot.docs.map(docSnapshot => ({ // Renamed doc to docSnapshot
          id: docSnapshot.id,
          ...(docSnapshot.data() as LocationDoc)
        } as Salon));
        setSalons(locationsList);
      } catch (error) {
        console.error("Error fetching salons: ", error);
        toast({ title: "Error Fetching Salons", description: "Could not load salon data.", variant: "destructive" });
      } finally {
        setIsFetchingSalons(false);
      }
    };
    fetchSalons();
  }, []);

  const handleAddHairdresser = async (data: HairdresserFormValues) => {
    setIsLoading(true);
    const tempPassword = data.initialPassword || generateTemporaryPassword();
    
    // Simple parsing of working_days from availability string.
    // This is a basic example; you might want more robust parsing based on your 'availability' format.
    const parsedWorkingDays = data.availability.toLowerCase().includes("mon") ? ["Monday"] : [];
    if (data.availability.toLowerCase().includes("tue")) parsedWorkingDays.push("Tuesday");
    if (data.availability.toLowerCase().includes("wed")) parsedWorkingDays.push("Wednesday");
    if (data.availability.toLowerCase().includes("thu")) parsedWorkingDays.push("Thursday");
    if (data.availability.toLowerCase().includes("fri")) parsedWorkingDays.push("Friday");
    if (data.availability.toLowerCase().includes("sat")) parsedWorkingDays.push("Saturday");
    if (data.availability.toLowerCase().includes("sun")) parsedWorkingDays.push("Sunday");

    const hairdresserDataForFunction: CreateHairdresserFunctionData = {
      email: data.email,
      password: tempPassword,
      displayName: data.name,
      assigned_locations: data.assigned_locations,
      availability: data.availability, // Pass the descriptive string
      working_days: parsedWorkingDays as DayOfWeek[], // Basic parsing for now
      specialties: data.specialties.split(",").map(s => s.trim()).filter(s => s),
      profilePictureUrl: data.profilePictureUrl || undefined,
    };

    try {
      const createHairdresserUser = httpsCallable<CreateHairdresserFunctionData, { status: string; userId: string; message: string }>(functions, 'createHairdresserUser');
      const result = await createHairdresserUser(hairdresserDataForFunction);
      
      toast({ title: "Hairdresser Added", description: result.data.message });
      router.push("/hairdressers");

    } catch (error: any) {
      console.error("Error calling createHairdresserUser function:", error);
      toast({ title: "Error Adding Hairdresser", description: error.message || "Could not add hairdresser.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingSalons) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading salon data...</span>
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
