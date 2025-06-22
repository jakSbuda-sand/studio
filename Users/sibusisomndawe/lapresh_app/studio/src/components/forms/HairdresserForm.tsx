
"use client";

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import type { Hairdresser, Salon, DayOfWeek, HairdresserWorkingHours, DailyWorkingHours } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2, ClockIcon } from "lucide-react";

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/; // HH:mm format

const dailyWorkingHoursSchema = z.object({
  start: z.string().regex(timeRegex, "Invalid start time (HH:MM)").optional().or(z.literal("")),
  end: z.string().regex(timeRegex, "Invalid end time (HH:MM)").optional().or(z.literal("")),
  isOff: z.boolean().default(false),
}).refine(data => (data.isOff || (data.start && data.end)), {
  message: "Start and end times are required unless marked as off.",
  path: ["start"], // Show error near start time, or make it global for the day
}).refine(data => {
    if (!data.isOff && data.start && data.end) {
      return data.start < data.end;
    }
    return true;
  }, {
    message: "Start time must be before end time.",
    path: ["end"],
});

const daysOfWeek: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const hairdresserFormSchema = z.object({
  name: z.string().min(2, { message: "Hairdresser name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  initialPassword: z.string().min(6, {message: "Initial password must be at least 6 characters."}).optional().or(z.literal('')),
  assigned_locations: z.array(z.string()).nonempty({ message: "Please select at least one salon." }),
  specialties: z.string().min(3, {message: "Enter at least one specialty (comma-separated)."}),
  availability: z.string().min(5, {message: "Please describe working days/hours (e.g., Mon-Fri 9am-5pm)."}),
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL for the profile picture." }).optional().or(z.literal('')),
  workingHours: z.object(
      daysOfWeek.reduce((acc, day) => {
        acc[day] = dailyWorkingHoursSchema;
        return acc;
      }, {} as Record<DayOfWeek, typeof dailyWorkingHoursSchema>)
    )
    .optional(),
});

export type HairdresserFormValues = z.infer<typeof hairdresserFormSchema>;

interface HairdresserFormProps {
  initialData?: Hairdresser | null;
  salons: Salon[];
  onSubmit: (data: HairdresserFormValues) => Promise<void>;
  isEditing?: boolean;
  isLoading?: boolean;
}

const defaultWorkingHours = daysOfWeek.reduce((acc, day) => {
  acc[day] = { start: day === "Saturday" || day === "Sunday" ? "" : "09:00", end: day === "Saturday" || day === "Sunday" ? "" : "17:00", isOff: day === "Saturday" || day === "Sunday" };
  return acc;
}, {} as HairdresserWorkingHours);


export function HairdresserForm({
  initialData,
  salons,
  onSubmit,
  isEditing = false,
  isLoading = false,
}: HairdresserFormProps) {
  
  const getInitialFormValues = React.useCallback(() => {
    const baseValues: HairdresserFormValues = {
      name: "",
      email: "",
      initialPassword: "",
      assigned_locations: [],
      specialties: "",
      availability: "Mon-Fri 9am-5pm, Sat 10am-3pm",
      profilePictureUrl: "",
      workingHours: JSON.parse(JSON.stringify(defaultWorkingHours))
    };

    if (isEditing && initialData) {
      const currentWorkingHours = initialData.workingHours 
        ? { ...defaultWorkingHours, ...initialData.workingHours } 
        : JSON.parse(JSON.stringify(defaultWorkingHours));
      
      daysOfWeek.forEach(day => {
        if (!currentWorkingHours[day]) {
          currentWorkingHours[day] = defaultWorkingHours[day];
        }
      });

      return {
        name: initialData.name || "",
        email: initialData.email || "",
        initialPassword: "",
        assigned_locations: initialData.assigned_locations || [],
        specialties: initialData.specialties ? initialData.specialties.join(", ") : "",
        availability: initialData.availability || baseValues.availability,
        profilePictureUrl: initialData.profilePictureUrl || "",
        workingHours: currentWorkingHours,
      };
    }
    return baseValues;
  }, [initialData, isEditing]);

  const form = useForm<HairdresserFormValues>({
    resolver: zodResolver(hairdresserFormSchema),
    defaultValues: getInitialFormValues(),
  });

  useEffect(() => {
    form.reset(getInitialFormValues());
  }, [initialData, getInitialFormValues, form]);

  const handleSubmitInternal = async (data: HairdresserFormValues) => {
    const processedWorkingHours: HairdresserWorkingHours = {};
    if (data.workingHours) {
      for (const day of daysOfWeek) {
        const hours = data.workingHours[day];
        if (hours) {
          if (!hours.isOff && hours.start && hours.end) {
            processedWorkingHours[day] = { start: hours.start, end: hours.end, isOff: false };
          } else {
            processedWorkingHours[day] = { start: "", end: "", isOff: true };
          }
        }
      }
    }
    await onSubmit({ ...data, workingHours: processedWorkingHours });
  };

  return (
    <Card className="shadow-none border-none">
        <CardContent className="p-0">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-8 font-body">
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
                    {isEditing && <FormDescription>Email cannot be changed after creation through this form.</FormDescription>}
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
                      <div className="mb-2">
                        <FormLabel className="text-base">Assigned Salons</FormLabel>
                        <FormDescription>
                          Select all salons this hairdresser will work at.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {salons.map((salon) => (
                          <FormField
                            key={salon.id}
                            control={form.control}
                            name="assigned_locations"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={salon.id}
                                  className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-accent/50 transition-colors"
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
                                  <FormLabel className="font-normal cursor-pointer flex-1 text-sm">
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

                <Card className="p-4 shadow-sm border">
                  <CardHeader className="p-2 mb-2">
                    <CardTitle className="text-lg font-headline flex items-center"><ClockIcon className="mr-2 h-5 w-5 text-primary"/>Working Hours</CardTitle>
                    <FormDescription>Set the hairdresser's typical weekly schedule. Mark as 'Day Off' if not working.</FormDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {daysOfWeek.map((day) => (
                      <div key={day} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 border rounded-md bg-muted/30">
                        <FormLabel className="md:col-span-3 font-semibold text-foreground">{day}</FormLabel>
                        
                        <FormField
                          control={form.control}
                          name={`workingHours.${day}.isOff`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 md:col-span-3 mb-2 md:mb-0">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked)
                                    if (checked) { // If marked as off, clear times
                                      form.setValue(`workingHours.${day}.start`, "");
                                      form.setValue(`workingHours.${day}.end`, "");
                                    } else {
                                        const defaultDaySetting = defaultWorkingHours[day];
                                        if (defaultDaySetting && !defaultDaySetting.isOff) {
                                            form.setValue(`workingHours.${day}.start`, defaultDaySetting.start);
                                            form.setValue(`workingHours.${day}.end`, defaultDaySetting.end);
                                        }
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">Day Off</FormLabel>
                            </FormItem>
                          )}
                        />

                        <Controller
                            name={`workingHours.${day}.start`}
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <FormItem className={form.watch(`workingHours.${day}.isOff`) ? 'hidden' : ''}>
                                <FormLabel htmlFor={`workingHours.${day}.start`} className="text-xs">Start Time</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} id={`workingHours.${day}.start`} disabled={form.watch(`workingHours.${day}.isOff`)} />
                                </FormControl>
                                {fieldState.error && <FormMessage className="text-xs">{fieldState.error.message}</FormMessage>}
                                </FormItem>
                            )}
                        />
                        <Controller
                            name={`workingHours.${day}.end`}
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <FormItem className={form.watch(`workingHours.${day}.isOff`) ? 'hidden' : ''}>
                                <FormLabel htmlFor={`workingHours.${day}.end`} className="text-xs">End Time</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} id={`workingHours.${day}.end`} disabled={form.watch(`workingHours.${day}.isOff`)} />
                                </FormControl>
                                {fieldState.error && <FormMessage className="text-xs">{fieldState.error.message}</FormMessage>}
                                </FormItem>
                            )}
                        />
                         {form.formState.errors.workingHours?.[day] && (
                            <FormMessage className="text-xs md:col-span-3">
                                {(form.formState.errors.workingHours?.[day] as any)?.root?.message || 
                                 (form.formState.errors.workingHours?.[day] as any)?.start?.message || 
                                 (form.formState.errors.workingHours?.[day] as any)?.end?.message}
                            </FormMessage>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>


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
                    <FormLabel>General Availability Notes (Text)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Flexible on weekends, Prefers morning appointments." {...field} /></FormControl>
                    <FormDescription>General notes about availability or preferences (this is separate from the structured working hours).</FormDescription>
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
                    <FormControl><Input placeholder="https://placehold.co/100x100.png" {...field} /></FormControl>
                    <FormDescription>A direct link to an image for their profile.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? (isEditing ? "Saving Changes..." : "Adding Hairdresser...") : (isEditing ? "Save Changes" : "Add Hairdresser")}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
