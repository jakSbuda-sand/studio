
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Booking, Salon, Hairdresser, User, LocationDoc, HairdresserDoc, BookingDoc, Service, ServiceDoc, DayOfWeek } from "@/lib/types";
import { CalendarDays, User as UserIcon, StoreIcon, ClockIcon, Filter, Loader2, Edit3, Briefcase } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isSameDay, addMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, doc, updateDoc, query, where, orderBy, Timestamp, Query, serverTimestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import BookingForm, { type BookingFormValues } from "@/components/forms/BookingForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


const getStatusColor = (status: Booking['status']): string => {
  switch (status) {
    case 'Completed': return 'hsl(130, 60%, 50%)';
    case 'Confirmed': return 'hsl(var(--primary))';
    case 'Pending': return 'hsl(38, 92%, 50%)';
    case 'Cancelled': return 'hsl(0, 0%, 60%)';
    case 'No-Show': return 'hsl(0, 84%, 60%)';
    default: return 'hsl(var(--muted-foreground))';
  }
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterSalonId, setFilterSalonId] = useState<string>("all");
  const [filterHairdresserId, setFilterHairdresserId] = useState<string>("all");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [workingHoursToday, setWorkingHoursToday] = useState<{start: string, end: string} | 'off' | null>(null);

  const bookingStatusOptions: Booking['status'][] = ['Confirmed', 'Completed', 'Cancelled', 'No-Show'];

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const fetchPrerequisites = async () => {
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({ id: sDoc.id, ...(sDoc.data() as LocationDoc) } as Salon));
        setSalons(salonsList);

        const hairdressersCol = collection(db, "hairdressers");
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => {
          const data = hDoc.data() as HairdresserDoc;
          return {
            id: hDoc.id, userId: data.userId, name: data.name, email: data.email,
            assignedLocations: data.assignedLocations || [], specialties: data.specialties || [],
            workingDays: data.workingDays || [],
            workingHours: data.workingHours || {},
            profilePictureUrl: data.profilePictureUrl || "", must_reset_password: data.must_reset_password || false,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdAt: data.createdAt, updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        setHairdressers(hairdressersList);
        
        const servicesCol = collection(db, "services");
        const serviceSnapshot = await getDocs(servicesCol);
        const servicesList = serviceSnapshot.docs.map(sDoc => ({id: sDoc.id, ...(sDoc.data() as ServiceDoc)} as Service));
        setServices(servicesList);

        if (user.role === 'hairdresser' && user.hairdresserProfileId) {
          setFilterHairdresserId(user.hairdresserProfileId);
          const hairdresserDetails = hairdressersList.find(h => h.id === user.hairdresserProfileId);
          if (hairdresserDetails && hairdresserDetails.assignedLocations.length > 0) {
            setFilterSalonId(hairdresserDetails.assignedLocations[0]);
          }
        }
      } catch (error: any) {
        console.error("Error fetching prerequisites:", error);
        toast({ title: "Error Fetching Data", description: `Could not load base data: ${error.message}.`, variant: "destructive" });
      }
    };

    fetchPrerequisites();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (salons.length === 0 || hairdressers.length === 0 || services.length === 0) return;

    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        let bookingsQueryBuilder: Query = query(collection(db, "bookings"), orderBy("appointmentDateTime", "asc"));
        
        if (user.role === 'hairdresser' && user.hairdresserProfileId) {
            bookingsQueryBuilder = query(bookingsQueryBuilder, where("hairdresserId", "==", user.hairdresserProfileId));
        } else {
            if (filterSalonId !== "all") {
                bookingsQueryBuilder = query(bookingsQueryBuilder, where("salonId", "==", filterSalonId));
            }
            if (filterHairdresserId !== "all") {
                bookingsQueryBuilder = query(bookingsQueryBuilder, where("hairdresserId", "==", filterHairdresserId));
            }
        }

        const bookingSnapshot = await getDocs(bookingsQueryBuilder);
        const bookingsList = bookingSnapshot.docs.map(bDoc => {
          const data = bDoc.data() as BookingDoc;
          let appointmentDateTimeJS: Date;
          if (data.appointmentDateTime instanceof Timestamp) {
            appointmentDateTimeJS = data.appointmentDateTime.toDate();
          } else {
            appointmentDateTimeJS = new Date(data.appointmentDateTime.toString());
          }
          const serviceDetails = services.find(s => s.id === data.serviceId);
          return {
            id: bDoc.id, clientName: data.clientName, clientEmail: data.clientEmail, clientPhone: data.clientPhone,
            salonId: data.salonId, hairdresserId: data.hairdresserId, serviceId: data.serviceId,
            serviceName: serviceDetails?.name || "Service Not Found",
            appointmentDateTime: appointmentDateTimeJS, durationMinutes: data.durationMinutes, status: data.status,
            notes: data.notes, color: getStatusColor(data.status), createdAt: data.createdAt, updatedAt: data.updatedAt,
          } as Booking;
        });
        setBookings(bookingsList);

      } catch (error: any) {
        console.error("Error fetching calendar data:", error);
        toast({ title: "Error Fetching Bookings", description: `Could not load appointments: ${error.message}.`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [user, filterSalonId, filterHairdresserId, services, salons, hairdressers]);

  useEffect(() => {
    if (filterHairdresserId !== "all" && selectedDate && hairdressers.length > 0) {
        const hairdresser = hairdressers.find(h => h.id === filterHairdresserId);
        if (hairdresser?.workingHours) {
            const dayOfWeek = format(selectedDate, 'EEEE') as DayOfWeek;
            const schedule = hairdresser.workingHours[dayOfWeek];
            if (schedule && !schedule.isOff && schedule.start && schedule.end) {
                setWorkingHoursToday({ start: schedule.start, end: schedule.end });
            } else {
                setWorkingHoursToday('off');
            }
        } else {
            setWorkingHoursToday(null); // No schedule defined for this hairdresser
        }
    } else {
        setWorkingHoursToday(null); // Reset if no specific hairdresser or date is selected
    }
  }, [selectedDate, filterHairdresserId, hairdressers]);

  
  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    setIsSubmitting(true);
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, { status: newStatus, updatedAt: serverTimestamp() });
        const newColor = getStatusColor(newStatus);
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus, color: newColor, updatedAt: Timestamp.now() } : b));
        toast({ title: "Status Updated", description: `Booking status changed to ${newStatus}.` });
    } catch (error: any) {
        console.error(`Error updating booking status to ${newStatus}:`, error);
        toast({ title: "Update Failed", description: `Could not update status: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleUpdateBooking = async (data: BookingFormValues) => {
    if (!editingBooking) return;
    setIsSubmitting(true);
    try {
      const newAppointmentStart = data.appointmentDateTime;
      const newAppointmentEnd = addMinutes(newAppointmentStart, data.durationMinutes);
      const bookingsRef = collection(db, "bookings");

      // Check for hairdresser conflicts
      const hairdresserQuery = query(bookingsRef, where("hairdresserId", "==", data.hairdresserId));
      const hairdresserSnapshot = await getDocs(hairdresserQuery);

      for (const docSnap of hairdresserSnapshot.docs) {
          if (docSnap.id === editingBooking.id) continue;
          const existing = docSnap.data() as BookingDoc;
          if (existing.status === 'Cancelled') continue;
          const existingStart = (existing.appointmentDateTime as Timestamp).toDate();
          if (!isSameDay(existingStart, newAppointmentStart)) continue;
          
          if (existing.salonId !== data.salonId) {
              const errorMsg = `This hairdresser is already booked at a different location on this day.`;
              toast({ title: "Scheduling Conflict", description: errorMsg, variant: "destructive", duration: 7000 });
              throw new Error(errorMsg);
          }
          const existingEnd = addMinutes(existingStart, existing.durationMinutes);
          if (newAppointmentStart < existingEnd && newAppointmentEnd > existingStart) {
              const errorMsg = `This hairdresser is already booked from ${format(existingStart, "p")} to ${format(existingEnd, "p")} on this day.`;
              toast({ title: "Booking Conflict", description: errorMsg, variant: "destructive", duration: 7000 });
              throw new Error(errorMsg);
          }
      }

      // Check for client conflicts
      const clientQuery = query(bookingsRef, where("clientPhone", "==", data.clientPhone));
      const clientSnapshot = await getDocs(clientQuery);

      for (const docSnap of clientSnapshot.docs) {
           if (docSnap.id === editingBooking.id) continue;
           const existing = docSnap.data() as BookingDoc;
           if (existing.status === 'Cancelled') continue;
           const existingStart = (existing.appointmentDateTime as Timestamp).toDate();
           if (!isSameDay(existingStart, newAppointmentStart)) continue;

           const existingEnd = addMinutes(existingStart, existing.durationMinutes);
           if (newAppointmentStart < existingEnd && newAppointmentEnd > existingStart) {
               const errorMsg = `This client is already booked from ${format(existingStart, "p")} to ${format(existingEnd, "p")} on this day.`;
               toast({ title: "Client Double-Booked", description: errorMsg, variant: "destructive", duration: 7000 });
               throw new Error(errorMsg);
           }
      }

      const bookingRef = doc(db, "bookings", editingBooking.id);
      const appointmentDateForFirestore = Timestamp.fromDate(data.appointmentDateTime);

      const updateData: Partial<BookingDoc> = {
        clientName: data.clientName, clientEmail: data.clientEmail || "", clientPhone: data.clientPhone,
        salonId: data.salonId, hairdresserId: data.hairdresserId, serviceId: data.serviceId,
        appointmentDateTime: appointmentDateForFirestore, durationMinutes: data.durationMinutes,
        status: data.status, notes: data.notes || "", updatedAt: serverTimestamp() as Timestamp,
      };

      await updateDoc(bookingRef, updateData as { [x: string]: any });

      const serviceDetails = services.find(s => s.id === data.serviceId);
      const updatedBookingForState: Booking = {
        ...editingBooking,
        ...data,
        appointmentDateTime: data.appointmentDateTime,
        serviceName: serviceDetails?.name || "Service Not Found",
        color: getStatusColor(data.status),
        updatedAt: Timestamp.now(), 
      };

      setBookings(prev => prev.map(b => b.id === editingBooking.id ? updatedBookingForState : b).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
      toast({ title: "Booking Updated", description: `Booking for ${data.clientName} has been updated.` });
      setIsFormOpen(false);
      setEditingBooking(null);
    } catch (error: any) {
        if (!(error instanceof Error && (error.message.includes("different location") || error.message.includes("already booked")))) {
           console.error("Error updating booking:", error);
           toast({ title: "Update Failed", description: `Could not update booking: ${error.message}`, variant: "destructive" });
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditForm = (booking: Booking) => {
    setEditingBooking(booking);
    setIsFormOpen(true);
  };

  const filteredBookingsByDate = bookings.filter(booking => selectedDate ? isSameDay(booking.appointmentDateTime, selectedDate) : true);
  
  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "N/A";
  const getHairdresserName = (hairdresserId: string) => hairdressers.find(h => h.id === hairdresserId)?.name || "N/A";

  const getStatusBadgeVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Completed': return 'outline';
      case 'Cancelled': return 'outline';
      case 'No-Show': return 'destructive';
      default: return 'secondary';
    }
  };

  const availableHairdressersForFilter = filterSalonId === "all" 
    ? hairdressers.filter(h => h.isActive) 
    : hairdressers.filter(h => h.isActive && h.assignedLocations.includes(filterSalonId));
  
  if (!user) return <p className="text-center mt-10 font-body">Please log in to view the calendar.</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.role === 'admin' ? "Admin Calendar View" : "My Calendar"}
        description="Visualize and manage appointments."
        icon={CalendarDays}
      />
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingBooking(null); }}>
        <DialogContent className="sm:max-w-2xl font-body max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-headline text-2xl">Edit Booking</DialogTitle></DialogHeader>
          {editingBooking && (
            <BookingForm 
              initialData={editingBooking} 
              salons={salons} 
              allHairdressers={hairdressers}
              onSubmit={handleUpdateBooking}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg rounded-lg">
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                         <ShadcnCalendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="rounded-md border shadow-sm p-0 w-full"
                        />
                    </div>
                    {user.role === 'admin' && (
                        <div className="md:w-1/3 space-y-4 pt-2">
                            <h3 className="font-headline text-lg flex items-center gap-2">
                                <Filter className="h-5 w-5 text-primary" /> Filters
                            </h3>
                            <div>
                                <label htmlFor="salon-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Salon</label>
                                <Select value={filterSalonId} onValueChange={(value) => { setFilterSalonId(value); if (value !== "all" && filterHairdresserId !== "all") { const selectedH = hairdressers.find(h => h.id === filterHairdresserId); if (selectedH && !selectedH.assignedLocations.includes(value)) setFilterHairdresserId("all"); } }}>
                                    <SelectTrigger id="salon-filter"><SelectValue placeholder="All Salons" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Salons</SelectItem>{salons.map(salon => <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="hairdresser-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Hairdresser</label>
                                <Select value={filterHairdresserId} onValueChange={setFilterHairdresserId} disabled={filterSalonId !== "all" && availableHairdressersForFilter.length === 0}>
                                    <SelectTrigger id="hairdresser-filter"><SelectValue placeholder="All Hairdressers" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Hairdressers</SelectItem>{availableHairdressersForFilter.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                                </Select>
                                {filterSalonId !== "all" && availableHairdressersForFilter.length === 0 && <p className="text-xs text-muted-foreground mt-1">No hairdressers for selected salon.</p>}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {workingHoursToday && filterHairdresserId !== 'all' && (
              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary"/>
                        Daily Schedule
                    </CardTitle>
                    <CardDescription>Working hours for {getHairdresserName(filterHairdresserId)} on {selectedDate ? format(selectedDate, "PPP") : ''}.</CardDescription>
                </CardHeader>
                <CardContent>
                     {typeof workingHoursToday === 'object' && workingHoursToday !== null ? (
                        <p className="text-sm font-medium text-foreground">
                            Scheduled to work from <strong className="text-primary">{workingHoursToday.start}</strong> to <strong className="text-primary">{workingHoursToday.end}</strong>.
                        </p>
                    ) : workingHoursToday === 'off' ? (
                        <p className="text-sm text-muted-foreground">This hairdresser has the day off.</p>
                    ) : (
                         <p className="text-sm text-muted-foreground">Working hours have not been defined for this hairdresser.</p>
                    )}
                </CardContent>
              </Card>
            )}

        </div>

        <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-lg rounded-lg sticky top-20">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Appointments for:</CardTitle>
                <CardDescription className="font-body font-bold text-lg text-primary">{selectedDate ? format(selectedDate, "PPP") : "All Dates"}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[65vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredBookingsByDate.length > 0 ? (
                    <div className="space-y-4">
                    {filteredBookingsByDate.map(booking => (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow" style={{ borderLeft: `4px solid ${booking.color || 'hsl(var(--primary))'}` }}>
                            <CardHeader className="flex flex-row items-start justify-between p-3">
                                <div>
                                    <CardTitle className="font-headline text-base">{booking.serviceName || "Unknown Service"}</CardTitle>
                                    <CardDescription className="font-body flex items-center gap-2 pt-1">
                                        <UserIcon size={14} /> {booking.clientName}
                                    </CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="p-1 h-auto -mt-1 -mr-1" disabled={isSubmitting}>
                                            <Badge variant={getStatusBadgeVariant(booking.status)} className="font-body cursor-pointer hover:opacity-80 transition-opacity text-xs">
                                                {booking.status}
                                            </Badge>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="font-body">
                                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {bookingStatusOptions.map((statusOption) => (
                                            <DropdownMenuItem key={statusOption} onClick={() => handleStatusUpdate(booking.id, statusOption)} disabled={isSubmitting || booking.status === statusOption}>
                                                {statusOption}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 space-y-1 text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <ClockIcon size={12} className="text-primary"/> 
                                    <span>{format(booking.appointmentDateTime, "p")} ({booking.durationMinutes} mins)</span>
                                </div>
                                {user.role === 'admin' && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <UserIcon size={12} className="text-primary"/> 
                                        <span>{getHairdresserName(booking.hairdresserId)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <StoreIcon size={12} className="text-primary"/> 
                                    <span>{getSalonName(booking.salonId)}</span>
                                </div>
                            </CardContent>
                             {user.role === 'admin' && (
                                <CardFooter className="p-2 border-t flex justify-end bg-muted/50">
                                    <Button variant="ghost" size="sm" onClick={() => openEditForm(booking)} className="font-body text-xs h-auto py-1 px-2" disabled={isSubmitting}>
                                        <Edit3 className="mr-1 h-3 w-3"/>Edit
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 font-body text-muted-foreground">No appointments for this day or filters.</p>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
