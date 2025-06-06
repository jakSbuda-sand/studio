
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
import type { Booking, Salon, Hairdresser } from "@/lib/types";
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
  salonId: z.string({ required_error: "Please select a salon." }), // Salon where booking is made
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
  initialDataPreselected?: Partial<BookingFormValues>;
  salons: Salon[];
  allHairdressers: Hairdresser[]; // All hairdressers in the system
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
    appointmentTime: format(new Date(), "HH:mm"),
    durationMinutes: 60,
    notes: "",
    ...initialDataPreselected,
  };


  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues,
  });
  
  useEffect(() => {
    const initialSalon = initialData?.salonId || initialDataPreselected?.salonId;
    if (initialSalon) {
        setSelectedSalonId(initialSalon);
        form.setValue("salonId", initialSalon, { shouldValidate: true, shouldDirty: true });

        // Filter hairdressers based on this initial salon
        const filtered = allHairdressers.filter(h => h.assigned_locations.includes(initialSalon));
        setAvailableHairdressers(filtered);

        // Pre-select hairdresser if applicable
        const initialHairdresser = initialData?.hairdresserId || initialDataPreselected?.hairdresserId;
        if (initialHairdresser && filtered.some(h => h.id === initialHairdresser)) {
            form.setValue("hairdresserId", initialHairdresser, { shouldValidate: true, shouldDirty: true });
        } else if (user?.role === 'hairdresser' && user.hairdresserProfileId && filtered.some(h => h.id === user.hairdresserProfileId)) {
            form.setValue("hairdresserId", user.hairdresserProfileId, { shouldDirty: true });
        }

    } else {
        // No initial salon, show all hairdressers or based on current selection if any
        if(selectedSalonId) {
            setAvailableHairdressers(allHairdressers.filter(h => h.assigned_locations.includes(selectedSalonId)));
        } else {
            setAvailableHairdressers([]); // Or allHairdressers if you want to show all before salon selection
        }
    }
  }, [initialData, initialDataPreselected, form, allHairdressers, user, selectedSalonId]);


  useEffect(() => {
    if (selectedSalonId) {
      const filtered = allHairdressers.filter(h => h.assigned_locations.includes(selectedSalonId));
      setAvailableHairdressers(filtered);
      
      const currentHairdresserId = form.getValues("hairdresserId");
      const isCurrentHairdresserInFilteredList = filtered.some(h => h.id === currentHairdresserId);

      if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
        if (filtered.some(h => h.id === user.hairdresserProfileId)) {
          form.setValue("hairdresserId", user.hairdresserProfileId, { shouldDirty: true });
        } else if (!isCurrentHairdresserInFilteredList) {
          form.setValue("hairdresserId", "", { shouldDirty: true });
        }
      } else if (!isCurrentHairdresserInFilteredList) {
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
  }, [form]);


  const handleSubmitInternal = async (data: BookingFormValues) => {
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    const combinedDateTime = new Date(data.appointmentDateTime);
    combinedDateTime.setHours(hours, minutes, 0, 0);
    
    await onSubmit({ ...data, appointmentDateTime: combinedDateTime });
    // form.reset(); // Reset form after successful submission if needed by parent
  };

  const timeSlots = Array.from({ length: (19-8)*2 + 1 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

  const isHairdresserRole = user?.role === 'hairdresser';
  const hairdresserProfileId = user?.hairdresserProfileId;

  // Determine if the salon select should be disabled
  const isSalonSelectDisabled = isHairdresserRole && 
                                !!initialDataPreselected?.salonId && 
                                !!user.hairdresserProfileId &&
                                allHairdressers.find(h => h.id === user.hairdresserProfileId)?.assigned_locations.includes(initialDataPreselected.salonId);


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
          <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6 font-body">
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
                    value={field.value}
                    disabled={isSalonSelectDisabled}
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
                    value={field.value}
                    disabled={
                        (!selectedSalonId || availableHairdressers.length === 0) || 
                        (isHairdresserRole && !!hairdresserProfileId && availableHairdressers.some(h => h.id === hairdresserProfileId))
                    }
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a hairdresser" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableHairdressers.map(h => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name}
                            {isHairdresserRole && h.id === hairdresserProfileId && " (You)"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!selectedSalonId && <FormDescription>Please select a salon first.</FormDescription>}
                  {selectedSalonId && availableHairdressers.length === 0 && <FormDescription>No hairdressers available for this salon.</FormDescription>}
                  {isHairdresserRole && !!hairdresserProfileId && availableHairdressers.some(h => h.id === hairdresserProfileId && form.getValues("hairdresserId") === hairdresserProfileId) && <FormDescription>Booking for yourself.</FormDescription>}
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
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="appointmentTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Time</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
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
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (initialData ? "Saving..." : "Creating...") : (initialData ? "Save Changes" : "Create Booking")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
