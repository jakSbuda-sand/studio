
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
import type { Booking, Salon, Hairdresser, Service, ServiceDoc, Client, ClientDoc, DayOfWeek, BookingDoc } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfDay, endOfDay, parse, addMinutes } from "date-fns";
import { CalendarIcon, ClipboardList, Clock, Loader2, Info, Settings2, UserCheck, Droplets } from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, Timestamp, limit, orderBy } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";


const bookingFormSchema = z.object({
  clientName: z.string().min(2, "Client name is required."),
  clientPhone: z.string().min(10, "A valid phone number is required.").max(15, "Phone number seems too long."),
  clientEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  salonId: z.string({ required_error: "Please select a salon." }),
  serviceId: z.string({ required_error: "Please select a service."}),
  hairdresserId: z.string({ required_error: "Please select a hairdresser." }),
  appointmentDateTime: z.date({ required_error: "Appointment date is required." }),
  appointmentTime: z.string({ required_error: "Please select an available time." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  durationMinutes: z.coerce.number().int().positive("Duration must be a positive number."),
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'], { required_error: "Booking status is required."}),
  addWashService: z.enum(['Yes', 'No']),
  notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  initialData?: Booking | null;
  initialDataPreselected?: Partial<BookingFormValues>;
  salons: Salon[];
  allHairdressers: Hairdresser[];
  onSubmit: (data: BookingFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export default function BookingForm({
  initialData,
  initialDataPreselected,
  salons,
  allHairdressers,
  onSubmit,
  isSubmitting = false
}: BookingFormProps) {
  const { user } = useAuth();
  const [selectedSalonId, setSelectedSalonId] = useState<string | undefined>(
    initialData?.salonId || initialDataPreselected?.salonId
  );
  const [availableHairdressers, setAvailableHairdressers] = useState<Hairdresser[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [washService, setWashService] = useState<Service | null>(null);

  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearchListOpen, setIsSearchListOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  const defaultValues: Partial<BookingFormValues> = initialData ? {
    ...initialData,
    appointmentDateTime: new Date(initialData.appointmentDateTime),
    appointmentTime: format(new Date(initialData.appointmentDateTime), "HH:mm"),
    status: initialData.status,
    serviceId: initialData.serviceId,
    addWashService: initialData.washServiceAdded ? 'Yes' : 'No',
  } : {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    salonId: initialDataPreselected?.salonId || "",
    serviceId: initialDataPreselected?.serviceId || "",
    hairdresserId: initialDataPreselected?.hairdresserId || "",
    appointmentDateTime: new Date(),
    appointmentTime: "",
    durationMinutes: 60,
    status: 'Confirmed',
    addWashService: 'No',
    notes: "",
    ...initialDataPreselected,
  };

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: defaultValues as BookingFormValues,
  });

  const selectedHairdresserId = form.watch("hairdresserId");
  const selectedDate = form.watch("appointmentDateTime");
  const duration = form.watch("durationMinutes");
  const { setValue } = form;

  useEffect(() => {
    // Fetch all services to find the 'Wash' service
    const fetchAllServices = async () => {
        try {
            const servicesCol = collection(db, "services");
            const servicesQuery = query(servicesCol, where("isActive", "==", true));
            const snapshot = await getDocs(servicesQuery);
            const allServices = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Service));
            const foundWashService = allServices.find(s => s.name.toLowerCase() === 'wash') || null;
            setWashService(foundWashService);
            if (!foundWashService) {
                console.warn("A service named 'Wash' was not found. The 'Add Wash Service' feature will only affect duration if a service named 'Wash' is created and active.");
            }
        } catch (error) {
            console.error("Failed to fetch services to find 'Wash' service:", error);
        }
    };
    fetchAllServices();
  }, []);

  const generateAndFilterSlots = useCallback(async () => {
    if (!selectedHairdresserId || !selectedDate || !duration || !selectedSalonId) {
        setTimeSlots([]);
        return;
    }

    setIsLoadingTimes(true);
    setValue("appointmentTime", "");

    const hairdresser = allHairdressers.find(h => h.id === selectedHairdresserId);
    if (!hairdresser?.workingHours) {
        toast({ title: "Schedule Not Found", description: "This hairdresser does not have defined working hours.", variant: "destructive" });
        setTimeSlots([]);
        setIsLoadingTimes(false);
        return;
    }

    const dayOfWeek = format(selectedDate, 'EEEE') as DayOfWeek;
    const schedule = hairdresser.workingHours[dayOfWeek];

    if (!schedule || schedule.isOff || !schedule.start || !schedule.end) {
        setTimeSlots([]);
        setIsLoadingTimes(false);
        return;
    }

    const potentialSlots: Date[] = [];
    let currentTime = parse(schedule.start, 'HH:mm', selectedDate);
    const endTime = parse(schedule.end, 'HH:mm', selectedDate);
    
    while (addMinutes(currentTime, duration) <= endTime) {
        potentialSlots.push(new Date(currentTime));
        currentTime = addMinutes(currentTime, 30);
    }

    const bookingsRef = collection(db, "bookings");
    const q = query(
        bookingsRef,
        where("hairdresserId", "==", selectedHairdresserId)
    );

    try {
        const querySnapshot = await getDocs(q);

        const bookingsOnSelectedDay = querySnapshot.docs
          .map(docSnap => {
            const data = docSnap.data() as BookingDoc;
            if (data.status === 'Cancelled') return null;

            let appointmentDateTime: Date;
            const rawDate = data.appointmentDateTime;

            if (rawDate && typeof (rawDate as any).toDate === 'function') {
                appointmentDateTime = (rawDate as Timestamp).toDate();
            } else if (rawDate) {
                appointmentDateTime = new Date(rawDate.toString());
            } else {
                console.warn("Booking has no appointmentDateTime:", docSnap.id);
                return null;
            }
            
            if (isNaN(appointmentDateTime.getTime()) || !isSameDay(appointmentDateTime, selectedDate)) {
                return null;
            }

            return { ...data, id: docSnap.id, appointmentDateTime };
          })
          .filter((b): b is (BookingDoc & { id: string, appointmentDateTime: Date }) => b !== null);
        
        const otherSalonBooking = bookingsOnSelectedDay.find(b => b.salonId !== selectedSalonId);
        if (otherSalonBooking) {
            const otherSalon = salons.find(s => s.id === otherSalonBooking.salonId);
            toast({
                title: "Scheduling Conflict",
                description: `This hairdresser is already booked at ${otherSalon?.name || 'another location'} on this day. Please select a different date.`,
                variant: "destructive",
                duration: 7000
            });
            setTimeSlots([]);
            setIsLoadingTimes(false);
            return;
        }

        const existingBookings = bookingsOnSelectedDay.map(booking => ({
            start: booking.appointmentDateTime,
            end: addMinutes(booking.appointmentDateTime, booking.durationMinutes)
        }));
        
        const availableSlots = potentialSlots.filter(slotStart => {
            const slotEnd = addMinutes(slotStart, duration);
            if (isSameDay(slotStart, new Date()) && slotStart < new Date()) {
                return false;
            }
            return !existingBookings.some(booking =>
                (slotStart < booking.end && slotEnd > booking.start)
            );
        });

        setTimeSlots(availableSlots.map(date => format(date, 'HH:mm')));
    } catch (error) {
        console.error("Error fetching bookings for time slots:", error);
        toast({ title: "Error fetching availability", description: "Could not verify available time slots.", variant: "destructive" });
        setTimeSlots([]);
    } finally {
        setIsLoadingTimes(false);
    }
  }, [selectedHairdresserId, selectedDate, duration, allHairdressers, setValue, selectedSalonId, salons]);

  useEffect(() => {
    generateAndFilterSlots();
  }, [generateAndFilterSlots]);


  const handleClientSelect = (client: Client) => {
    form.setValue("clientName", client.name, { shouldValidate: true });
    form.setValue("clientPhone", client.phone, { shouldValidate: true });
    form.setValue("clientEmail", client.email || "", { shouldValidate: true });
    setIsSearchListOpen(false);
    setSearchResults([]);
  };

  const fetchClientsByName = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setSearchResults([]);
      setIsSearchListOpen(false);
      return;
    }
    setIsSearching(true);
    const searchTerm = name.toLowerCase();
    try {
      const clientsRef = collection(db, "clients");
      const q = query(
        clientsRef,
        where("name_lowercase", ">=", searchTerm),
        where("name_lowercase", "<=", searchTerm + "\uf8ff"),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as ClientDoc) } as Client));
      setSearchResults(results);
      setIsSearchListOpen(results.length > 0);
    } catch (error) {
      console.error("Error searching for clients:", error);
      toast({ title: "Search Error", description: "Could not perform client search.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clientNameValue = form.watch("clientName");

  useEffect(() => {
    const handler = setTimeout(() => {
      const selectedClient = searchResults.find(r => r.name === clientNameValue);
      if(!selectedClient){
        fetchClientsByName(clientNameValue);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [clientNameValue, fetchClientsByName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsSearchListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  useEffect(() => {
    form.reset(defaultValues as BookingFormValues);
    const initialSalonToSet = initialData?.salonId || initialDataPreselected?.salonId;
    if (initialSalonToSet) {
      setSelectedSalonId(initialSalonToSet);
      form.setValue("salonId", initialSalonToSet, { shouldDirty: !!initialDataPreselected?.salonId });
      const initialServiceToSet = initialData?.serviceId || initialDataPreselected?.serviceId;
      if(initialServiceToSet){
        form.setValue("serviceId", initialServiceToSet, { shouldDirty: !!initialDataPreselected?.serviceId });
      }
      const initialHairdresserToSet = initialData?.hairdresserId || initialDataPreselected?.hairdresserId;
      if (initialHairdresserToSet) {
         form.setValue("hairdresserId", initialHairdresserToSet, { shouldDirty: !!initialDataPreselected?.hairdresserId });
      }
    } else {
      setSelectedSalonId(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, initialDataPreselected, form.reset]);


  useEffect(() => {
    if (selectedSalonId) {
        // Start with all active hairdressers for the salon
        const activeHairdressers = allHairdressers.filter(h => 
            h.isActive && h.assignedLocations.includes(selectedSalonId)
        );

        // If editing, ensure the original hairdresser is in the list, even if inactive
        const initialHairdresserId = initialData?.hairdresserId;
        if (initialHairdresserId) {
            const initialHairdresser = allHairdressers.find(h => h.id === initialHairdresserId);
            if (initialHairdresser && !activeHairdressers.some(h => h.id === initialHairdresserId)) {
                // If the initial hairdresser is not in the list (e.g., inactive or unassigned), add them.
                activeHairdressers.push(initialHairdresser);
            }
        }
        
        setAvailableHairdressers(activeHairdressers);

        const currentHairdresserId = form.getValues("hairdresserId");
        const isCurrentHairdresserValidForSalon = activeHairdressers.some(h => h.id === currentHairdresserId);

        if (user?.role === 'hairdresser' && user.hairdresserProfileId && activeHairdressers.some(h => h.id === user.hairdresserProfileId)) {
            if (form.getValues("hairdresserId") !== user.hairdresserProfileId) {
                form.setValue("hairdresserId", user.hairdresserProfileId, { shouldDirty: true });
            }
        } else if (currentHairdresserId && !isCurrentHairdresserValidForSalon) {
            form.setValue("hairdresserId", "", { shouldDirty: true });
        }
    } else {
        setAvailableHairdressers([]);
        if (form.getValues("hairdresserId") !== "") {
            form.setValue("hairdresserId", "", { shouldDirty: true });
        }
    }
}, [selectedSalonId, allHairdressers, user, form, initialData]);


  useEffect(() => {
    if (selectedSalonId) {
      setIsFetchingServices(true);
      const fetchServices = async () => {
        try {
          const servicesCol = collection(db, "services");
          const servicesQuery = query(servicesCol, where("salonIds", "array-contains", selectedSalonId), where("isActive", "==", true));
          const serviceSnapshot = await getDocs(servicesQuery);
          const servicesList = serviceSnapshot.docs.map(sDoc => ({
            id: sDoc.id,
            ...(sDoc.data() as ServiceDoc)
          } as Service));
          setAvailableServices(servicesList);
          const currentServiceId = form.getValues("serviceId");
          if(currentServiceId && !servicesList.some(s => s.id === currentServiceId)){
            form.setValue("serviceId", "", { shouldDirty: true });
            form.setValue("durationMinutes", 60); 
          }
        } catch (error) {
          console.error("Error fetching services for salon:", error);
          toast({ title: "Error", description: "Could not load services for the selected salon.", variant: "destructive"});
          setAvailableServices([]);
        } finally {
          setIsFetchingServices(false);
        }
      };
      fetchServices();
    } else {
      setAvailableServices([]);
      form.setValue("serviceId", "", { shouldDirty: true });
      form.setValue("durationMinutes", 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalonId, form.setValue]);


  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "salonId") {
        setSelectedSalonId(value.salonId);
      }
      if (name === "serviceId" || name === 'addWashService') {
        const serviceId = form.getValues("serviceId");
        const addWash = form.getValues("addWashService") === 'Yes';
        const selectedService = availableServices.find(s => s.id === serviceId);
        
        if (selectedService) {
            let totalDuration = selectedService.durationMinutes;
            if (addWash && washService) {
                totalDuration += washService.durationMinutes;
            }
            form.setValue("durationMinutes", totalDuration, { shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, availableServices, washService]);


  const handleSubmitInternal = async (data: BookingFormValues) => {
    const [hours, minutes] = data.appointmentTime.split(':').map(Number);
    const combinedDateTime = new Date(data.appointmentDateTime);
    combinedDateTime.setHours(hours, minutes, 0, 0);
    await onSubmit({ ...data, appointmentDateTime: combinedDateTime });
  };

  const isHairdresserRole = user?.role === 'hairdresser';
  const hairdresserProfileId = user?.hairdresserProfileId;
  const isSalonSelectDisabled = isHairdresserRole && !!initialDataPreselected?.salonId && !!hairdresserProfileId && allHairdressers.find(h => h.id === hairdresserProfileId)?.assignedLocations.includes(initialDataPreselected.salonId);
  const isHairdresserSelectDisabled = (!selectedSalonId || availableHairdressers.length === 0) || (isHairdresserRole && !!hairdresserProfileId && availableHairdressers.some(h => h.id === hairdresserProfileId && form.getValues("hairdresserId") === hairdresserProfileId));
  const bookingStatusOptions: Booking['status'][] = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'];

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
                   <div className="relative" ref={searchWrapperRef}>
                    <FormControl>
                      <Input 
                        placeholder="Search or type new name..." 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          if (!isSearchListOpen) setIsSearchListOpen(true);
                        }}
                        autoComplete="off"
                      />
                    </FormControl>
                    {isSearching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    {isSearchListOpen && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-card border rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                        <ul>
                          {searchResults.map(client => (
                            <li
                              key={client.id}
                              className="p-3 hover:bg-accent cursor-pointer"
                              onClick={() => handleClientSelect(client)}
                              onMouseDown={(e) => e.preventDefault()} // Prevents input blur before click
                            >
                              <p className="font-medium text-sm">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.phone}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="clientPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Phone</FormLabel>
                  <FormControl><Input type="tel" placeholder="082 123 4567" {...field} /></FormControl>
                  <FormDescription>Will be auto-filled from search.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="clientEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>Client Email (Optional)</FormLabel>
                <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="salonId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Salon Location</FormLabel>
                  <Select
                    onValueChange={(value) => { field.onChange(value); setSelectedSalonId(value); form.setValue("serviceId", ""); form.setValue("hairdresserId", ""); }}
                    value={field.value}
                    disabled={isSalonSelectDisabled}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a salon" /></SelectTrigger></FormControl>
                    <SelectContent>{salons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="serviceId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    value={field.value}
                    disabled={!selectedSalonId || isFetchingServices || availableServices.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <Settings2 className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder={isFetchingServices ? "Loading services..." : "Select a service"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isFetchingServices && availableServices.length === 0 && <p className="p-2 text-sm text-muted-foreground">No services for this salon.</p>}
                      {availableServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (R{s.price.toFixed(2)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!selectedSalonId && <FormDescription>Please select a salon first.</FormDescription>}
                  {selectedSalonId && !isFetchingServices && availableServices.length === 0 && <FormDescription>No active services found for the selected salon.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
             <FormField control={form.control} name="addWashService" render={({ field }) => (
              <FormItem>
                <FormLabel>Add Wash Service?</FormLabel>
                 <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!washService}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <Droplets className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes (+{washService?.durationMinutes} min, +R{washService?.price.toFixed(2)})</SelectItem>
                    </SelectContent>
                  </Select>
                  {!washService && <FormDescription>A service named "Wash" must be created to use this option.</FormDescription>}
                  <FormMessage />
              </FormItem>
             )}/>

            <FormField control={form.control} name="hairdresserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Hairdresser</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isHairdresserSelectDisabled}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a hairdresser" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {availableHairdressers.map(h => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                          {isHairdresserRole && h.id === hairdresserProfileId && " (You)"}
                          {!h.isActive && " (Inactive)"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!selectedSalonId && <FormDescription>Please select a salon first.</FormDescription>}
                {selectedSalonId && availableHairdressers.length === 0 && <FormDescription>No active hairdressers available for this salon.</FormDescription>}
                {isHairdresserRole && !!hairdresserProfileId && form.getValues("hairdresserId") === hairdresserProfileId && <FormDescription>Booking for yourself.</FormDescription>}
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
                   <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingTimes || timeSlots.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                         {isLoadingTimes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!isLoadingTimes && <Clock className="mr-2 h-4 w-4 opacity-50" />}
                        <SelectValue placeholder={isLoadingTimes ? "Loading..." : "Select a time"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {timeSlots.length > 0 ? (
                            timeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)
                        ) : (
                           <p className="p-2 text-sm text-muted-foreground">No available slots.</p>
                        )}
                    </SelectContent>
                  </Select>
                  {!selectedHairdresserId && <FormDescription>Select service and hairdresser first.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl><Input type="number" placeholder="60" {...field} readOnly className="bg-muted/50" /></FormControl>
                  <FormDescription>Auto-filled based on selected service.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            {initialData && (
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Booking Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <Info className="mr-2 h-4 w-4 opacity-50" />
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {bookingStatusOptions.map(statusValue => (
                            <SelectItem key={statusValue} value={statusValue}>
                            {statusValue}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Client has very long hair, allergic to certain products." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || form.formState.isSubmitting || isSearching || isLoadingTimes}>
              {(isSubmitting || form.formState.isSubmitting || isSearching || isLoadingTimes) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Booking"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
