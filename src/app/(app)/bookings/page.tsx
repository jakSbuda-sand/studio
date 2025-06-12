
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Booking, Salon, Hairdresser, User, LocationDoc, HairdresserDoc, BookingDoc } from "@/lib/types";
import { ClipboardList, Edit3, Trash2, PlusCircle, CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pageTitle, setPageTitle] = useState("All Bookings");
  const [pageDescription, setPageDescription] = useState("View and manage all scheduled appointments.");

  useEffect(() => {
    console.log("==> [BookingsPage_Effect] useEffect triggered. User:", user ? user.uid : "NULL", "ViewMode:", viewMode);
    if (!user) {
      console.log("==> [BookingsPage_Effect] No user, skipping data fetch.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      console.log("==> [BookingsPage_Effect_FetchData] fetchData started.");
      setIsLoading(true);
      try {
        console.log("==> [BookingsPage_Effect_FetchData] Fetching salons from 'locations'...");
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        console.log(`==> [BookingsPage_Effect_FetchData] Fetched ${salonsList.length} salons.`);
        setSalons(salonsList);

        console.log("==> [BookingsPage_Effect_FetchData] Fetching hairdressers from 'hairdressers'...");
        const hairdressersCol = collection(db, "hairdressers");
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => {
          const data = hDoc.data() as HairdresserDoc;
          return {
            id: hDoc.id,
            userId: data.user_id,
            name: data.name,
            email: data.email,
            assigned_locations: data.assigned_locations || [],
            specialties: data.specialties || [],
            availability: data.availability || "",
            working_days: data.working_days || [],
            profilePictureUrl: data.profilePictureUrl || "",
            must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        console.log(`==> [BookingsPage_Effect_FetchData] Fetched ${hairdressersList.length} hairdressers.`);
        setHairdressers(hairdressersList);

        console.log("==> [BookingsPage_Effect_FetchData] Constructing bookings query...");
        let bookingsQueryBuilder = query(collection(db, "bookings"), orderBy("appointmentDateTime", "asc"));

        let currentViewTitle = "All Bookings";
        let currentViewDescription = "View and manage all scheduled appointments.";

        if (user.role === 'hairdresser' && user.hairdresserProfileId) {
          console.log("==> [BookingsPage_Effect_FetchData] User is hairdresser. Filtering bookings for hairdresserId:", user.hairdresserProfileId);
          bookingsQueryBuilder = query(collection(db, "bookings"), where("hairdresserId", "==", user.hairdresserProfileId), orderBy("appointmentDateTime", "asc"));
          currentViewTitle = "My Bookings";
          currentViewDescription = "View and manage your scheduled appointments.";
        } else if (user.role === 'admin') {
          console.log("==> [BookingsPage_Effect_FetchData] User is admin. Fetching all bookings.");
        }
        setPageTitle(currentViewTitle);
        setPageDescription(currentViewDescription);

        console.log("==> [BookingsPage_Effect_FetchData] Executing bookings query...");
        const bookingSnapshot = await getDocs(bookingsQueryBuilder);
        const bookingsList = bookingSnapshot.docs.map(bDoc => {
          const data = bDoc.data() as BookingDoc;
          console.log(`==> [BookingsPage_Effect_FetchData] Raw booking data for ${bDoc.id}:`, JSON.stringify(data).substring(0,200)+"...");

          let appointmentDateTimeJS: Date;
          if (data.appointmentDateTime instanceof Timestamp) {
            appointmentDateTimeJS = data.appointmentDateTime.toDate();
          } else if (typeof data.appointmentDateTime === 'string') {
            appointmentDateTimeJS = new Date(data.appointmentDateTime);
          } else {
            appointmentDateTimeJS = data.appointmentDateTime;
          }

          return {
            id: bDoc.id,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            salonId: data.salonId,
            hairdresserId: data.hairdresserId,
            service: data.service,
            appointmentDateTime: appointmentDateTimeJS,
            durationMinutes: data.durationMinutes,
            status: data.status,
            notes: data.notes,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Booking;
        });
        console.log(`==> [BookingsPage_Effect_FetchData] Fetched and mapped ${bookingsList.length} bookings.`);
        const sortedBookingsList = bookingsList.sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
        setBookings(sortedBookingsList);

      } catch (error: any) {
        console.error("==> [BookingsPage_Effect_FetchData] Error fetching data:", error);
        toast({ title: "Error Fetching Data", description: `Could not load data: ${error.message}. Check console.`, variant: "destructive" });
      } finally {
        console.log("==> [BookingsPage_Effect_FetchData] fetchData finished.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, viewMode]);

  const handleUpdateBooking = async (data: BookingFormValues) => {
    if (!editingBooking) {
        console.error("==> [BookingsPage_HandleUpdate] No editingBooking set. Aborting.");
        return;
    }
    console.log("==> [BookingsPage_HandleUpdate] Attempting to update booking ID:", editingBooking.id, "with data:", JSON.stringify(data, null, 2));
    setIsSubmitting(true);
    try {
      const bookingRef = doc(db, "bookings", editingBooking.id);

      const appointmentDateForFirestore = Timestamp.fromDate(data.appointmentDateTime);
      console.log("==> [BookingsPage_HandleUpdate] Converted appointmentDateTime to Firestore Timestamp:", appointmentDateForFirestore);

      const updateData: Partial<BookingDoc> = {
        clientName: data.clientName,
        clientEmail: data.clientEmail || "",
        clientPhone: data.clientPhone,
        salonId: data.salonId,
        hairdresserId: data.hairdresserId,
        service: data.service,
        appointmentDateTime: appointmentDateForFirestore,
        durationMinutes: data.durationMinutes,
        status: data.status,
        notes: data.notes || "",
        updatedAt: serverTimestamp() as Timestamp,
      };
      console.log("==> [BookingsPage_HandleUpdate] Prepared Firestore update data:", JSON.stringify(updateData, null, 2));

      await updateDoc(bookingRef, updateData as { [x: string]: any });
      console.log("==> [BookingsPage_HandleUpdate] Firestore document updated successfully.");

      const updatedBookingForState: Booking = {
        id: editingBooking.id, // Keep existing ID
        createdAt: editingBooking.createdAt, // Keep existing createdAt
        clientName: data.clientName,
        clientEmail: data.clientEmail || "",
        clientPhone: data.clientPhone,
        salonId: data.salonId,
        hairdresserId: data.hairdresserId,
        service: data.service,
        appointmentDateTime: data.appointmentDateTime, // This is already a JS Date from the form
        durationMinutes: data.durationMinutes,
        status: data.status,
        notes: data.notes || "",
        updatedAt: Timestamp.now(), // For UI quick update
      };

      setBookings(prev => prev.map(b => b.id === editingBooking.id ? updatedBookingForState : b).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
      toast({ title: "Booking Updated", description: `Booking for ${data.clientName} has been updated.` });
      setIsFormOpen(false);
      setEditingBooking(null);
    } catch (error: any) {
      console.error("==> [BookingsPage_HandleUpdate] Error updating booking:", error);
      toast({ title: "Update Failed", description: `Could not update booking: ${error.message}`, variant: "destructive" });
    } finally {
      console.log("==> [BookingsPage_HandleUpdate] Update process finished.");
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingToCancel: Booking) => {
    console.log("==> [BookingsPage_HandleCancel] Attempting to cancel booking ID:", bookingToCancel.id);
    setIsSubmitting(true);
    try {
      const bookingRef = doc(db, "bookings", bookingToCancel.id);
      await updateDoc(bookingRef, {
        status: 'Cancelled',
        updatedAt: serverTimestamp() as Timestamp
      });
      console.log("==> [BookingsPage_HandleCancel] Firestore document status updated to Cancelled.");

      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? { ...b, status: 'Cancelled' as 'Cancelled', updatedAt: Timestamp.now() } : b).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
      toast({ title: "Booking Cancelled", description: `Booking for ${bookingToCancel.clientName} has been cancelled.`, variant: "default" });
    } catch (error: any) {
      console.error("==> [BookingsPage_HandleCancel] Error cancelling booking:", error);
      toast({ title: "Cancellation Failed", description: `Could not cancel booking: ${error.message}`, variant: "destructive" });
    } finally {
      console.log("==> [BookingsPage_HandleCancel] Cancellation process finished.");
      setIsSubmitting(false);
    }
  };

  const openEditForm = (booking: Booking) => {
    console.log("==> [BookingsPage_OpenEditForm] Opening edit form for booking:", JSON.stringify(booking, null, 2).substring(0,300)+"...");
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
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading bookings...</span>
      </div>
    );
  }

  if (!user) {
    return <p className="text-center mt-10 font-body">Please log in to view bookings.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        icon={ClipboardList}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/bookings/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New Booking
            </Link>
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            console.log("==> [BookingsPage_DialogChange] Closing dialog, resetting editingBooking.");
            setEditingBooking(null);
          }
        }}>
        <DialogContent className="sm:max-w-2xl font-body">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              {editingBooking ? "Edit Booking" : "New Booking"}
            </DialogTitle>
          </DialogHeader>
          {(editingBooking || (isFormOpen && !editingBooking)) && (
            <BookingForm
              initialData={editingBooking}
              salons={salons}
              allHairdressers={hairdressers}
              onSubmit={editingBooking ? handleUpdateBooking : async (data) => {
                  console.warn("==> [BookingsPage_DialogSubmit] New booking submission from dialog is not standard flow. Use /bookings/new.");
                  toast({title: "Action Not Configured", description: "Please use the 'New Booking' page to create appointments.", variant: "destructive"});
                  setIsFormOpen(false);
              }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {bookings.length === 0 ? (
         <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader>
            <CalendarDays className="mx-auto h-16 w-16 text-muted-foreground" />
            <CardTitle className="mt-4 text-2xl font-headline">No Bookings Found</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              There are no appointments scheduled that match your current view.
            </CardDescription>
          </CardContent>
           <CardFooter className="justify-center">
             <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/bookings/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create First Booking
                </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Appointments</CardTitle>
           <CardDescription className="font-body">A list of appointments based on your role and filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Client</TableHead>
                <TableHead className="font-headline">Date & Time</TableHead>
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
                  <TableCell>{booking.service}</TableCell>
                  {user.role === 'admin' && <TableCell>{getHairdresserName(booking.hairdresserId)}</TableCell>}
                  <TableCell>{getSalonName(booking.salonId)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(booking.status)} className="font-body">{booking.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(booking)} className="hover:text-primary" disabled={isSubmitting}>
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="hover:text-destructive" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Cancel</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-headline">Cancel Booking?</AlertDialogTitle>
                            <AlertDialogDescription className="font-body">
                              Are you sure you want to cancel this booking for {booking.clientName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-body" disabled={isSubmitting}>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelBooking(booking)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Cancellation"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

    