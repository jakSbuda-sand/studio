
"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Hairdresser, Salon } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Palette } from "lucide-react";
import React from "react";

const hairdresserFormSchema = z.object({
  name: z.string().min(2, { message: "Hairdresser name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  initialPassword: z.string().min(6, {message: "Initial password must be at least 6 characters."}).optional().or(z.literal('')),
  salonId: z.string({ required_error: "Please select a salon." }),
  specialties: z.string().min(3, {message: "Enter at least one specialty."}),
  availability: z.string().min(5, {message: "Please describe working days/hours."}),
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  color_code: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Invalid hex color (e.g. #RRGGBB or #RGB).").optional().or(z.literal('')),
});

export type HairdresserFormValues = z.infer<typeof hairdresserFormSchema>;

interface HairdresserFormProps {
  initialData?: Hairdresser | null;
  salons: Salon[];
  onSubmit: (data: HairdresserFormValues) => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function HairdresserForm({ initialData, salons, onSubmit, isEditing = false, isLoading = false }: HairdresserFormProps) {
  
  const getInitialFormValues = () => {
    if (initialData) {
      return {
        name: initialData.name,
        email: initialData.email,
        initialPassword: "", 
        salonId: initialData.assigned_locations?.[0] || "",
        specialties: initialData.specialties.join(", "),
        availability: initialData.working_days?.join(", ") || initialData.availability,
        profilePictureUrl: initialData.profilePictureUrl || "",
        color_code: initialData.color_code || "#FFFFFF", 
      };
    } else {
      return {
        name: "",
        email: "",
        initialPassword: "",
        salonId: "",
        specialties: "",
        availability: "",
        profilePictureUrl: "", 
        color_code: "#FFFFFF",
      };
    }
  };

  const form = useForm<HairdresserFormValues>({
    resolver: zodResolver(hairdresserFormSchema),
    defaultValues: getInitialFormValues(),
  });
  
  React.useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            email: initialData.email,
            initialPassword: "",
            salonId: initialData.assigned_locations?.[0] || "",
            specialties: initialData.specialties.join(", "),
            availability: initialData.working_days?.join(", ") || initialData.availability,
            profilePictureUrl: initialData.profilePictureUrl || "",
            color_code: initialData.color_code || "#FFFFFF",
        });
    } else {
        form.reset({ 
            name: "",
            email: "",
            initialPassword: "",
            salonId: "",
            specialties: "",
            availability: "",
            profilePictureUrl: "",
            color_code: "#FFFFFF",
        });
    }
  }, [initialData, form.reset]);


  const handleSubmitInternal = async (data: HairdresserFormValues) => {
    const submissionData = { ...data };
    // Removed the 'delete submissionData.initialPassword;' line.
    // If initialPassword is "" (empty string from form), it will be passed as such.
    // This is handled correctly by the Zod schema and downstream functions.
    await onSubmit(submissionData);
  };

  return (
    <Card className="shadow-none border-none">
        <CardContent className="p-0">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6 font-body">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem> <FormLabel>Full Name</FormLabel> <FormControl> <Input placeholder="e.g., Alice Wonderland" {...field} /> </FormControl> <FormMessage /> </FormItem>
                )}/>
                 <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem> <FormLabel>Email Address</FormLabel> <FormControl> <Input type="email" placeholder="e.g., alice@salonverse.com" {...field} disabled={isEditing} /> </FormControl> <FormDescription>{isEditing ? "Email cannot be changed after creation." : "This will be their login email."}</FormDescription> <FormMessage /> </FormItem>
                )}/>
                {!isEditing && (
                    <FormField control={form.control} name="initialPassword" render={({ field }) => (
                        <FormItem> <FormLabel>Temporary Password</FormLabel>
                        <FormControl> <div className="relative"> <Lock className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> <Input type="password" placeholder="Leave blank to auto-generate" {...field} className="pl-8"/> </div> </FormControl>
                        <FormDescription>User will be required to change this on first login. If blank, one will be auto-generated.</FormDescription> <FormMessage /> </FormItem>
                    )}
                  )}
                <FormField control={form.control} name="salonId" render={({ field }) => (
                    <FormItem> <FormLabel>Primary Assigned Salon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl> <SelectTrigger> <SelectValue placeholder="Select a salon location" /> </SelectTrigger> </FormControl>
                        <SelectContent> {salons.map(salon => ( <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem> ))} </SelectContent>
                    </Select>
                    <FormDescription>This hairdresser will be primarily assigned here.</FormDescription> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="specialties" render={({ field }) => (
                    <FormItem> <FormLabel>Specialties</FormLabel> <FormControl> <Input placeholder="e.g., Haircuts, Coloring, Balayage" {...field} /> </FormControl> <FormDescription>Comma-separated list.</FormDescription> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="availability" render={({ field }) => (
                    <FormItem> <FormLabel>Working Days / General Availability</FormLabel> <FormControl> <Textarea placeholder="e.g., Mon, Tue, Wed, Fri (9am-5pm); Sat (10am-2pm)" {...field} /> </FormControl> <FormDescription>Describe their general working days and hours.</FormDescription> <FormMessage /> </FormItem>
                )}/>
                 <FormField control={form.control} name="color_code" render={({ field }) => (
                    <FormItem> <FormLabel>Calendar Color Code (Optional)</FormLabel>
                    <FormControl> <div className="flex items-center gap-2"> <Palette className="h-5 w-5 text-muted-foreground" /> <Input type="text" placeholder="#RRGGBB" {...field} className="w-32" /> <div style={{backgroundColor: field.value || '#ccc'}} className="w-6 h-6 rounded-sm border"/></div></FormControl>
                    <FormDescription>Hex color for their appointments in the calendar.</FormDescription> <FormMessage /> </FormItem>
                )}/>
                <FormField control={form.control} name="profilePictureUrl" render={({ field }) => (
                    <FormItem> <FormLabel>Profile Picture URL (Optional)</FormLabel> <FormControl> <Input placeholder="https://example.com/image.png" {...field} /> </FormControl> <FormMessage /> </FormItem>
                )}/>
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                    {isLoading ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Hairdresser")}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
