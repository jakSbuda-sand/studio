
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BookingForm, { type BookingFormValues } from "@/components/forms/BookingForm";
import type { Booking, Salon, Hairdresser, User, LocationDoc, HairdresserDoc, BookingDoc, Service, ServiceDoc } from "@/lib/types";
import { ClipboardList, Edit3, PlusCircle, CalendarDays, Loader2, Droplets, ChevronLeft, ChevronRight } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isSameDay, addMinutes, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from 'next/navigation';
import { db, collection, getDocs, doc, updateDoc, query, where, orderBy, Timestamp, serverTimestamp } from "@/lib/firebase";

export default function BookingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const [pageTitle, setPageTitle] = useState("All Bookings");
  const [pageDescription, setPageDescription] = useState("View and manage all scheduled appointments.");
  
  const bookingStatusOptions: Booking['status'][] = ['Confirmed', 'Completed', 'Cancelled', 'No-Show'];

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
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
        const servicesList = serviceSnapshot.docs.map(sDoc => ({ id: sDoc.id, ...(sDoc.data() as ServiceDoc)} as Service));
        setServices(servicesList);

        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        let bookingsQueryBuilder;
        let currentViewTitle = "All Bookings";
        let currentViewDescription = `Viewing appointments for ${format(selectedMonth, "MMMM yyyy")}.`;

        if (user.role === 'hairdresser' && user.hairdresserProfileId) {
          bookingsQueryBuilder = query(
            collection(db, "bookings"), 
            where("hairdresserId", "==", user.hairdresserProfileId), 
            orderBy("appointmentDateTime", "asc"),
            where("appointmentDateTime", ">=", Timestamp.fromDate(start)),
            where("appointmentDateTime", "<=", Timestamp.fromDate(end))
          );
          currentViewTitle = "My Bookings";
        } else {
           bookingsQueryBuilder = query(
            collection(db, "bookings"), 
            orderBy("appointmentDateTime", "asc"),
            where("appointmentDateTime", ">=", Timestamp.fromDate(start)),
            where("appointmentDateTime", "<=", Timestamp.fromDate(end))
          );
        }

        setPageTitle(currentViewTitle);
        setPageDescription(currentViewDescription);

        const bookingSnapshot = await getDocs(bookingsQueryBuilder);
        const bookingsList = bookingSnapshot.docs.map(bDoc => {
          const data = bDoc.data() as BookingDoc;
          let appointmentDateTimeJS: Date;
          if (data.appointmentDateTime instanceof Timestamp) {
            appointmentDateTimeJS = data.appointmentDateTime.toDate();
          } else if (typeof data.appointmentDateTime === 'string') {
            appointmentDateTimeJS = new Date(data.appointmentDateTime);
          } else {
            appointmentDateTimeJS = data.appointmentDateTime;
          }
          
          const serviceDetails = servicesList.find(s => s.id === data.serviceId);

          return {
            id: bDoc.id, clientName: data.clientName, clientEmail: data.clientEmail, clientPhone: data.clientPhone,
            salonId: data.salonId, hairdresserId: data.hairdresserId, serviceId: data.serviceId,
            serviceName: serviceDetails?.name || "Service Not Found",
            appointmentDateTime: appointmentDateTimeJS, durationMinutes: data.durationMinutes, status: data.status,
            notes: data.notes, createdAt: data.createdAt, updatedAt: data.updatedAt,
            washServiceAdded: data.washServiceAdded || false,
          } as Booking;
        });
        const sortedBookingsList = bookingsList.sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
        setBookings(sortedBookingsList);

      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({ title: "Error Fetching Data", description: `Could not load data: ${error.message}.`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, viewMode, selectedMonth]);
  
  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    setIsSubmitting(true);
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, { status: newStatus, updatedAt: serverTimestamp() });
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus, updatedAt: Timestamp.now() } : b).sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
        toast({ title: "Status Updated", description: `Booking status changed to ${newStatus}.` });
    } catch (error: any) {
        console.error(`Error updating booking status to ${newStatus}:`, error);
        toast({ title: "Update Failed", description: `Could not update status: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));
  const handleGoToToday = () => setSelectedMonth(new Date());

  const handleUpdateBooking = async (data: BookingFormValues) => {
    if (!editingBooking) return;
    setIsSubmitting(true);
    try {
       const newAppointmentStart = data.appointmentDateTime;
       const newAppointmentEnd = addMinutes(newAppointmentStart, data.durationMinutes);
       const bookingsRef = collection(db, "bookings");
       
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
        washServiceAdded: data.addWashService === 'Yes',
      };

      await updateDoc(bookingRef, updateData as { [x: string]: any });

      const serviceDetails = services.find(s => s.id === data.serviceId);
      const updatedBookingForState: Booking = {
        ...editingBooking,
        ...data,
        appointmentDateTime: data.appointmentDateTime,
        serviceName: serviceDetails?.name || "Service Not Found",
        washServiceAdded: data.addWashService === 'Yes',
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2 font-body">Loading bookings...</span>
      </div>
    );
  }

  if (!user) return <p className="text-center mt-10 font-body">Please log in to view bookings.</p>;

  return (
    <div className="space-y-8">
      <PageHeader title={pageTitle} description={pageDescription} icon={ClipboardList}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex flex-col items-center">
                    <span className="font-headline text-lg w-36 text-center">{format(selectedMonth, "MMMM yyyy")}</span>
                    <Button variant="link" onClick={handleGoToToday} className="h-auto p-0 text-xs">go to today</Button>
                </div>
                <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/bookings/new">
                <span className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Booking
                </span>
              </Link>
            </Button>
          </div>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingBooking(null); }}>
        <DialogContent className="sm:max-w-2xl font-body max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-headline text-2xl">{editingBooking ? "Edit Booking" : "New Booking"}</DialogTitle></DialogHeader>
          {(editingBooking || (isFormOpen && !editingBooking)) && (
            <BookingForm initialData={editingBooking} salons={salons} allHairdressers={hairdressers}
              onSubmit={editingBooking ? handleUpdateBooking : async () => { setIsFormOpen(false); }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {bookings.length === 0 ? (
        <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader><CalendarDays className="mx-auto h-16 w-16 text-muted-foreground" /><CardTitle className="mt-4 text-2xl font-headline">No Bookings Found</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">There are no appointments scheduled for {format(selectedMonth, "MMMM yyyy")}.</CardDescription></CardContent>
          <CardFooter className="justify-center"><Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground"><Link href="/bookings/new"><PlusCircle className="mr-2 h-4 w-4" /> Create First Booking</Link></Button></CardFooter>
        </Card>
      ) : (
      <Card className="shadow-lg rounded-lg">
        <CardHeader><CardTitle className="font-headline">Appointments</CardTitle><CardDescription className="font-body">A list of appointments for {format(selectedMonth, "MMMM yyyy")}.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Client</TableHead>
                <TableHead className="font-headline">Date &amp; Time</TableHead>
                <TableHead className="font-headline">Service</TableHead>
                {user.role === 'admin' && <TableHead className="font-headline">Hairdresser</TableHead>}
                <TableHead className="font-headline">Salon</TableHead>
                <TableHead className="font-headline">Status</TableHead>
                <TableHead className="text-right font-headline">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} className="font-body">
                  <TableCell>
                    <div className="font-medium text-foreground">{booking.clientName}</div>
                    <div className="text-sm text-muted-foreground">{booking.clientPhone}</div>
                    {booking.clientEmail && <div className="text-xs text-muted-foreground">{booking.clientEmail}</div>}
                  </TableCell>
                  <TableCell>
                    <div>{format(new Date(booking.appointmentDateTime), "MMM dd, yyyy")}</div>
                    <div className="text-sm text-muted-foreground">{format(new Date(booking.appointmentDateTime), "p")}</div>
                  </TableCell>
                  <TableCell>
                     <div>{booking.serviceName || "N/A"}</div>
                      {booking.washServiceAdded && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Droplets size={12} className="text-blue-500" />
                          <span>Wash Included</span>
                        </div>
                      )}
                  </TableCell>
                  {user.role === 'admin' && <TableCell>{getHairdresserName(booking.hairdresserId)}</TableCell>}
                  <TableCell>{getSalonName(booking.salonId)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-1 h-auto" disabled={isSubmitting}>
                                <Badge variant={getStatusBadgeVariant(booking.status)} className="font-body cursor-pointer hover:opacity-80 transition-opacity">
                                    {booking.status}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-body">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {bookingStatusOptions.map((statusOption) => (
                                <DropdownMenuItem 
                                    key={statusOption} 
                                    onClick={() => handleStatusUpdate(booking.id, statusOption)}
                                    disabled={isSubmitting || booking.status === statusOption}
                                >
                                    {statusOption}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role === 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(booking)} className="hover:text-primary" disabled={isSubmitting}>
                            <Edit3 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
