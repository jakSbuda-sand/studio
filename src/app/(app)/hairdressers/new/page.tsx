
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Salon, DayOfWeek } from "@/lib/types";
import { UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand", phone: "011 555 1234", operatingHours: "Mon-Fri: 9am-6pm, Sat: 9am-4pm" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg", phone: "011 555 5678", operatingHours: "Tue-Sat: 8am-7pm, Sun: 10am-3pm" },
];

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
  const [salons] = useState<Salon[]>(mockSalonsData);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddHairdresser = async (data: HairdresserFormValues) => {
    setIsLoading(true);
    const tempPassword = data.initialPassword || generateTemporaryPassword();
    
    const hairdresserDataForFunction = {
      email: data.email,
      password: tempPassword,
      displayName: data.name,
      assigned_locations: data.assigned_locations, // This is now an array
      working_days: data.availability.split(',').map(d => d.trim() as DayOfWeek), // Basic parsing
      specialties: data.specialties.split(",").map(s => s.trim()),
      profilePictureUrl: data.profilePictureUrl,
    };

    console.log("Submitting to Cloud Function (simulated):", hairdresserDataForFunction);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ 
        title: "Hairdresser Added (Simulation)", 
        description: `${data.name} was added. Assigned to ${data.assigned_locations.length} salon(s). Temp Password: ${tempPassword}. Real integration needed.` 
      });
      // In a real app, you'd likely update a global state or re-fetch hairdressers on the main page.
      // For now, we just navigate back.
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
