
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Booking, Salon, Hairdresser } from "@/lib/types"; // Removed User import as it's not directly used here
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const bookingFormSchema = z.object({
  clientName: z.string().min(2, "Client name is required."),
  clientPhone: z.string().min(10, "A valid phone number is required."),
  clientEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  salonId: z.string({ required_error: "Please select a salon." }),
  hairdresserId: z.string({ required_error: "Please select a hairdresser." }),
  service: z.string().min(3, "Service description is required."),
  appointmentDateTime: z.date({ required_error: "Appointment date is required." }),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  durationMinutes: z.coerce.number().int().positive("Duration must be a positive number."),
  notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  initialData?: Booking | null;
  initialDataPreselected?: Partial<BookingFormValues>; // For pre-filling hairdresser/salon for new bookings by hairdressers
  salons: Salon[];
  allHairdressers: Hairdresser[];
  onSubmit: (data: BookingFormValues) => Promise<void>;
}

export function BookingForm({ initialData, initialDataPreselected, salons, allHairdressers, onSubmit }: BookingFormProps) {
  const { user } = useAuth();
  const [selectedSalonId, setSelectedSalonId] = useState<string | undefined>(initialData?.salonId || initialDataPreselected?.salonId);
  const [availableHairdressers, setAvailableHairdressers] = useState<Hairdresser[]>([]);

  const defaultValues = initialData ? {
    ...initialData,
    appointmentDateTime: new Date(initialData.appointmentDateTime),
    appointmentTime: format(new Date(initialData.appointmentDateTime), "HH:mm"),
  } : {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    salonId: initialDataPreselected?.salonId || "",
    hairdresserId: initialDataPreselected?.hairdresserId || "",
    service: "",
    appointmentDateTime: new Date(),
    appointmentTime: format(new Date(), "HH:mm"), // Default to current time, or a sensible default like 09:00
    durationMinutes: 60,
    notes: "",
    ...initialDataPreselected, // Apply other pre-selections
  };


  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues,
  });

  useEffect(() => {
    // If initialData or initialDataPreselected provides salonId, set it.
    const initialSalon = initialData?.salonId || initialDataPreselected?.salonId;
    if (initialSalon) {
        setSelectedSalonId(initialSalon);
        form.setValue("salonId", initialSalon, { shouldValidate: true, shouldDirty: true });
    }
    // If initialData or initialDataPreselected provides hairdresserId, set it.
    const initialHairdresser = initialData?.hairdresserId || initialDataPreselected?.hairdresserId;
    if (initialHairdresser) {
        form.setValue("hairdresserId", initialHairdresser, { shouldValidate: true, shouldDirty: true });
    }
  }, [initialData, initialDataPreselected, form]); // form.setValue was form, check if this is intended


  useEffect(() => {
    if (selectedSalonId) {
      const filteredHairdressers = allHairdressers.filter(h => h.salonId === selectedSalonId);
      setAvailableHairdressers(filteredHairdressers);
      
      const currentHairdresserId = form.getValues("hairdresserId");
      const isCurrentHairdresserInFilteredList = filteredHairdressers.some(h => h.id === currentHairdresserId);

      if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
        // If user is a hairdresser and their profile ID matches the selected salon, ensure they are selected.
        if (filteredHairdressers.some(h => h.id === user.hairdresserProfileId)) {
          form.setValue("hairdresserId", user.hairdresserProfileId, { shouldDirty: true });
        } else if (!isCurrentHairdresserInFilteredList) {
          // If their profile ID is not in the list (e.g. different salon selected), clear selection.
          form.setValue("hairdresserId", "", { shouldDirty: true });
        }
      } else if (!isCurrentHairdresserInFilteredList) {
        // For admin, or if current hairdresser is not in new list, clear selection.
        form.setValue("hairdresserId", "", { shouldDirty: true });
      }
    } else {
      setAvailableHairdressers([]);
      form.setValue("hairdresserId", "", { shouldDirty: true });
    }
  }, [selectedSalonId, allHairdressers, form, user]);
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "salonId") {
        setSelectedSalonId(value.salonId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setSelectedSalonId]); // form.watch was form


  const handleSubmit = async (data: BookingFormValues) => {
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    const combinedDateTime = new Date(data.appointmentDateTime);
    combinedDateTime.setHours(hours, minutes, 0, 0);
    
    await onSubmit({ ...data, appointmentDateTime: combinedDateTime });
    form.reset(); // Reset form after successful submission if needed
  };

  const timeSlots = Array.from({ length: (19-8)*2 + 1 }, (_, i) => { // 8:00 AM to 7:00 PM, 30 min intervals
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

  const isHairdresserRole = user?.role === 'hairdresser';
  const hairdresserProfileId = user?.hairdresserProfileId;

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {initialData ? "Edit Booking" : "Create New Booking"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 font-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="clientPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Phone</FormLabel>
                  <FormControl><Input placeholder="082 123 4567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="clientEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>Client Email (Optional)</FormLabel>
                <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="salonId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Salon Location</FormLabel>
                  <Select 
                    onValueChange={(value) => { field.onChange(value); setSelectedSalonId(value); }} 
                    value={field.value} // Ensure value is controlled
                    disabled={isHairdresserRole && !!initialDataPreselected?.salonId} // Disable if hairdresser and preselected
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a salon" /></SelectTrigger></FormControl>
                    <SelectContent>{salons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="hairdresserId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hairdresser</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} // Ensure value is controlled
                    disabled={
                        (!selectedSalonId || availableHairdressers.length === 0) || 
                        (isHairdresserRole && !!hairdresserProfileId && availableHairdressers.some(h => h.id === hairdresserProfileId)) // Disable if hairdresser is creating for self and is in list
                    }
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a hairdresser" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isHairdresserRole && hairdresserProfileId && availableHairdressers.find(h => h.id === hairdresserProfileId) ? (
                        // If hairdresser is logged in, their profile ID is known, AND they are in the list for the selected salon,
                        // show them as the primary (and potentially only, if disabled) option.
                        <SelectItem key={hairdresserProfileId} value={hairdresserProfileId}>
                          {availableHairdressers.find(h => h.id === hairdresserProfileId)?.name} (You)
                        </SelectItem>
                      ) : (
                        // For admins, or if the logged-in hairdresser is not in the current salon's list (e.g. selected a different salon)
                        // or if no specific hairdresser is pre-selected for a hairdresser role.
                        availableHairdressers.map(h => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))
                      )}
                       {/* This additional map was causing duplicates. The logic above should handle both cases.
                           If an admin is viewing, the first part of the ternary (isHairdresserRole && ...) will be false,
                           leading to the map of availableHairdressers.
                           If availableHairdressers is empty in that case, nothing is rendered, which is correct.
                       */}
                    </SelectContent>
                  </Select>
                  {!selectedSalonId && <FormDescription>Please select a salon first.</FormDescription>}
                  {selectedSalonId && availableHairdressers.length === 0 && (!isHairdresserRole || !hairdresserProfileId || !availableHairdressers.find(h => h.id === hairdresserProfileId)) && <FormDescription>No hairdressers available for this salon.</FormDescription>}
                  {isHairdresserRole && !!hairdresserProfileId && availableHairdressers.some(h => h.id === hairdresserProfileId) && <FormDescription>Booking for yourself.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="service" render={({ field }) => (
              <FormItem>
                <FormLabel>Service / Style</FormLabel>
                <FormControl><Input placeholder="e.g., Ladies Cut & Blowdry, Full Head Highlights" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="appointmentDateTime" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Appointment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus 
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } // Disable past dates
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="appointmentTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Time</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}> {/* Ensure value is controlled */}
                    <FormControl>
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Client has very long hair, allergic to certain products." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {initialData ? "Save Changes" : "Create Booking"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

