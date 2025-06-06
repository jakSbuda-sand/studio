
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Salon, DayOfWeek } from "@/lib/types"; // Hairdresser type not directly needed here, form handles it
import { UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
// Assuming functions and httpsCallable are for future Firebase integration
// import { functions, httpsCallable } from "@/lib/firebase"; 

// Mock Data (replace with Firestore fetches if necessary, or pass from parent if this page structure changes)
const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand", phone: "011 555 1234", operatingHours: "Mon-Fri: 9am-6pm, Sat: 9am-4pm" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg", phone: "011 555 5678", operatingHours: "Tue-Sat: 8am-7pm, Sun: 10am-3pm" },
];

// Helper to generate a temporary password (client-side, for admin to see)
const generateTemporaryPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

export default function NewHairdresserPage() {
  const router = useRouter();
  const [salons] = useState<Salon[]>(mockSalonsData); // In a real app, fetch this or ensure it's up-to-date
  const [isLoading, setIsLoading] = useState(false);

  const handleAddHairdresser = async (data: HairdresserFormValues) => {
    setIsLoading(true);
    const tempPassword = data.initialPassword || generateTemporaryPassword();
    
    const hairdresserDataForFunction = {
      email: data.email,
      password: tempPassword,
      displayName: data.name,
      assigned_locations: [data.salonId],
      working_days: data.availability.split(',').map(d => d.trim() as DayOfWeek), // Basic parsing, refine as needed
      // color_code: data.color_code || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`, // color_code removed from form for now
      specialties: data.specialties.split(",").map(s => s.trim()),
      profilePictureUrl: data.profilePictureUrl,
    };

    console.log("Submitting to Cloud Function (simulated):", hairdresserDataForFunction);

    try {
      // **Placeholder for Cloud Function Call**
      // const createHairdresser = httpsCallable(functions, 'createHairdresserUser');
      // const result = await createHairdresser(hairdresserDataForFunction);
      // console.log("Cloud Function result:", result.data);
      // toast({ title: "Hairdresser Added", description: `${data.name} created. Temp Password: ${tempPassword}. Cloud function call needed.` });
      // router.push("/hairdressers");
      
      // Simulate success for UI testing:
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ 
        title: "Hairdresser Added (Simulation)", 
        description: `${data.name} was added. Temporary Password: ${tempPassword}. Real integration requires deploying and calling the 'createHairdresserUser' Cloud Function.` 
      });
      router.push("/hairdressers");

    } catch (error: any) {
      console.error("Error calling createHairdresserUser function (simulated):", error);
      toast({ title: "Error Adding Hairdresser", description: error.message || "Could not add hairdresser.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
