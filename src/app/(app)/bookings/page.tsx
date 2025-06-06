
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingForm, type BookingFormValues } from "@/components/forms/BookingForm";
import type { Booking, Salon, Hairdresser, User } from "@/lib/types";
import { ClipboardList, Edit3, Trash2, PlusCircle, CalendarDays } from "lucide-react";
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

// Mock data (replace with actual API calls)
const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", salonId: "1", specialties: [], availability: "", email: "alice@salonverse.com" },
  { id: "h2", name: "Bob Johnson", salonId: "2", specialties: [], availability: "", email: "bob@salonverse.com" },
  { id: "h3", name: "Carol White", salonId: "1", specialties: [], availability: "", email: "carol@salonverse.com" },
];

let globalMockBookingsData: Booking[] = [
  { id: "b1", clientName: "John Doe", clientPhone: "0812345678", salonId: "1", hairdresserId: "h1", service: "Men's Cut", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 45, status: "Confirmed" },
  { id: "b2", clientName: "Jane Smith", clientPhone: "0823456789", salonId: "2", hairdresserId: "h2", service: "Ladies Cut & Blowdry", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 2)), durationMinutes: 90, status: "Pending" },
  { id: "b3", clientName: "Mike Brown", clientPhone: "0834567890", salonId: "1", hairdresserId: "h3", service: "Color Correction", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 3)), durationMinutes: 180, status: "Completed" },
  { id: "b4", clientName: "Alice Client", clientPhone: "0811112222", salonId: "1", hairdresserId: "h1", service: "Highlights", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 4)), durationMinutes: 120, status: "Confirmed" },
];


async function updateBookingAction(id: string, data: BookingFormValues): Promise<Booking> {
  console.log("Updating booking:", id, data);
  await new Promise(resolve => setTimeout(resolve, 500));
   const updatedBooking: Booking = {
    ...(globalMockBookingsData.find(b => b.id === id)!),
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
    salonId: data.salonId,
    hairdresserId: data.hairdresserId,
    service: data.service,
    appointmentDateTime: data.appointmentDateTime,
    durationMinutes: data.durationMinutes,
    notes: data.notes,
    status: globalMockBookingsData.find(b => b.id === id)?.status || 'Pending', // Keep existing status or default
  };
  globalMockBookingsData = globalMockBookingsData.map(b => b.id === id ? updatedBooking : b);
  toast({ title: "Booking Updated", description: `Booking for ${data.clientName} has been updated.` });
  return updatedBooking;
}

async function cancelBookingAction(id: string): Promise<Booking> {
  console.log("Cancelling booking:", id);
  await new Promise(resolve => setTimeout(resolve, 500));
  const bookingToCancel = globalMockBookingsData.find(b => b.id === id);
  if (!bookingToCancel) throw new Error("Booking not found");
  const cancelledBooking = { ...bookingToCancel, status: 'Cancelled' as 'Cancelled' };
  globalMockBookingsData = globalMockBookingsData.map(b => b.id === id ? cancelledBooking : b);
  toast({ title: "Booking Cancelled", description: `Booking has been cancelled.`, variant: "destructive" });
  return cancelledBooking;
}


export default function BookingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view'); // For hairdresser's "My Bookings"

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons] = useState<Salon[]>(mockSalonsData);
  const [hairdressers] = useState<Hairdresser[]>(mockHairdressersData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  const [pageTitle, setPageTitle] = useState("All Bookings");
  const [pageDescription, setPageDescription] = useState("View and manage all scheduled appointments.");


  useEffect(() => {
    if (user) {
      let filteredData = globalMockBookingsData;
      if (user.role === 'hairdresser' && viewMode === 'mine') {
        filteredData = globalMockBookingsData.filter(b => b.hairdresserId === user.hairdresserProfileId);
        setPageTitle("My Bookings");
        setPageDescription("View and manage your scheduled appointments.");
      } else if (user.role === 'hairdresser' && viewMode !== 'mine') {
        // Hairdressers trying to access /bookings directly will be redirected by sidebar or should see their bookings
        // For now, if they land here without `view=mine`, show their bookings.
        filteredData = globalMockBookingsData.filter(b => b.hairdresserId === user.hairdresserProfileId);
         setPageTitle("My Bookings");
        setPageDescription("View and manage your scheduled appointments.");
      } else {
        // Admin sees all
        setPageTitle("All Bookings");
        setPageDescription("View and manage all scheduled appointments.");
      }
      setBookings(filteredData.sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
    }
  }, [user, viewMode]);


  const handleUpdateBooking = async (data: BookingFormValues) => {
    if (!editingBooking) return;
    const updatedBooking = await updateBookingAction(editingBooking.id, data);
    setBookings(prev => prev.map(b => b.id === editingBooking.id ? updatedBooking : b).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
    setIsFormOpen(false);
    setEditingBooking(null);
  };

  const handleCancelBooking = async (id: string) => {
    const cancelledBooking = await cancelBookingAction(id);
    setBookings(prev => prev.map(b => b.id === id ? cancelledBooking : b).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()));
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
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (!user) return <p>Loading...</p>; // Or some other loading indicator

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
          if (!isOpen) setEditingBooking(null);
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
                // This part is for creating a new booking directly from this page's dialog,
                // which might not be the primary flow if /bookings/new is used.
                // For now, this requires a create action.
                // Let's assume create is handled by /new and this dialog is only for edits.
                // If a new booking needs to be created here, we need a createBookingAction similar to updateBookingAction.
                // For simplicity, we can disable "New Booking" from this dialog if editingBooking is null.
                // Or, more robustly, fetch and setBookings again.
                // For now, let's keep it focused on editing. If it's a new booking from dialog, user should go to /bookings/new
                if(editingBooking) {
                    await handleUpdateBooking(data);
                } else {
                    toast({title: "Action Not Configured", description: "Please use the 'New Booking' page to create appointments.", variant: "destructive"});
                }
              }}
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
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(booking)} className="hover:text-primary">
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="hover:text-destructive">
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
                            <AlertDialogCancel className="font-body">Keep Booking</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelBooking(booking.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body">
                              Confirm Cancellation
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
