
"use client";

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea might be used for other fields if form expands
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Hairdresser, Salon } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Lock } from "lucide-react"; // Users for header icon

// Schema without color_code for now
const hairdresserFormSchema = z.object({
  name: z.string().min(2, { message: "Hairdresser name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  initialPassword: z.string().min(6, {message: "Initial password must be at least 6 characters."}).optional().or(z.literal('')),
  salonId: z.string({ required_error: "Please select a salon." }),
  specialties: z.string().min(3, {message: "Enter at least one specialty (comma-separated)."}), // Changed description
  availability: z.string().min(5, {message: "Please describe working days/hours (e.g., Mon-Fri 9am-5pm)."}), // Changed description
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL for the profile picture." }).optional().or(z.literal('')),
});

export type HairdresserFormValues = z.infer<typeof hairdresserFormSchema>;

interface HairdresserFormProps {
  initialData?: Hairdresser | null;
  salons: Salon[];
  onSubmit: (data: HairdresserFormValues) => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function HairdresserForm({
  initialData,
  salons,
  onSubmit,
  isEditing = false,
  isLoading = false,
}: HairdresserFormProps) {
  
  const getInitialFormValues = React.useCallback(() => {
    if (isEditing && initialData) {
      return {
        name: initialData.name || "",
        email: initialData.email || "",
        initialPassword: "", // Password field is for initial creation or specific reset, not for general edit
        salonId: initialData.salonId || (salons.length > 0 ? salons[0].id : ""),
        specialties: initialData.specialties ? initialData.specialties.join(", ") : "",
        availability: initialData.availability || "",
        profilePictureUrl: initialData.profilePictureUrl || "",
      };
    }
    // For new hairdresser
    return {
      name: "",
      email: "",
      initialPassword: "",
      salonId: salons.length > 0 ? salons[0].id : "",
      specialties: "",
      availability: "",
      profilePictureUrl: "",
    };
  }, [initialData, salons, isEditing]);

  const form = useForm<HairdresserFormValues>({
    resolver: zodResolver(hairdresserFormSchema),
    defaultValues: getInitialFormValues(),
  });

  useEffect(() => {
    form.reset(getInitialFormValues());
  }, [initialData, salons, isEditing, form.reset, getInitialFormValues]);

  const handleSubmitInternal = async (data: HairdresserFormValues) => {
    const submissionData = { ...data };
    // If editing and password field is empty, don't submit it (it's optional)
    // This logic is now handled by the backend/Cloud Function if password isn't provided for update
    // For creation, if initialPassword is empty, the backend will generate one.
    await onSubmit(submissionData);
  };

  return (
    <Card className="shadow-none border-none">
        <CardContent className="p-0">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6 font-body">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} disabled={isEditing} /></FormControl>
                    {isEditing && <FormDescription>Email cannot be changed after creation.</FormDescription>}
                    <FormMessage />
                    </FormItem>
                )}
                />

                {!isEditing && (
                <FormField
                    control={form.control}
                    name="initialPassword"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Initial Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Leave blank to auto-generate" {...field} /></FormControl>
                        <FormDescription className="flex items-center gap-1">
                            <Lock size={12}/> Must be at least 6 characters. User will be prompted to change on first login.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                )}

                <FormField
                control={form.control}
                name="salonId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Assign to Salon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a salon" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {salons.map(salon => <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl><Input placeholder="e.g., Coloring, Extensions, Bridal Hair" {...field} /></FormControl>
                    <FormDescription>Comma-separated list of specialties.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Working Schedule / Availability</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-3pm (flexible)" {...field} /></FormControl>
                    <FormDescription>Describe their general working days and hours.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="profilePictureUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Profile Picture URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                    <FormDescription>A direct link to an image for their profile.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? (isEditing ? "Saving Changes..." : "Adding Hairdresser...") : (isEditing ? "Save Changes" : "Add Hairdresser")}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
