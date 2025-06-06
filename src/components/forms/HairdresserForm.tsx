
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Hairdresser, Salon } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card"; // CardHeader, CardTitle removed as not used directly
import { Users, Lock } from "lucide-react";

const hairdresserFormSchema = z.object({
  name: z.string().min(2, { message: "Hairdresser name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  initialPassword: z.string().min(6, {message: "Initial password must be at least 6 characters."}).optional().or(z.literal('')),
  assigned_locations: z.array(z.string()).nonempty({ message: "Please select at least one salon." }),
  specialties: z.string().min(3, {message: "Enter at least one specialty (comma-separated)."}),
  availability: z.string().min(5, {message: "Please describe working days/hours (e.g., Mon-Fri 9am-5pm)."}),
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
        initialPassword: "", 
        assigned_locations: initialData.assigned_locations || [],
        specialties: initialData.specialties ? initialData.specialties.join(", ") : "",
        availability: initialData.availability || "",
        profilePictureUrl: initialData.profilePictureUrl || "",
      };
    }
    return {
      name: "",
      email: "",
      initialPassword: "",
      assigned_locations: [],
      specialties: "",
      availability: "",
      profilePictureUrl: "",
    };
  }, [initialData, isEditing]);

  const form = useForm<HairdresserFormValues>({
    resolver: zodResolver(hairdresserFormSchema),
    defaultValues: getInitialFormValues(),
  });

  useEffect(() => {
    form.reset(getInitialFormValues());
  }, [initialData, getInitialFormValues, form]); // form.reset simplified to just 'form'

  const handleSubmitInternal = async (data: HairdresserFormValues) => {
    await onSubmit(data);
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
                  name="assigned_locations"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Assigned Salons</FormLabel>
                        <FormDescription>
                          Select all salons this hairdresser will work at.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {salons.map((salon) => (
                          <FormField
                            key={salon.id}
                            control={form.control}
                            name="assigned_locations"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={salon.id}
                                  className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm hover:bg-accent/50 transition-colors"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(salon.id)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValue, salon.id])
                                          : field.onChange(
                                              currentValue.filter(
                                                (value) => value !== salon.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer flex-1">
                                    {salon.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
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
