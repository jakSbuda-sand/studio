
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking, BookingDoc, Client, User, Salon, Hairdresser, Service, LocationDoc, HairdresserDoc, ServiceDoc } from "@/lib/types";
import { UserCircle, Phone, Mail, CalendarDays, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

export default function ClientDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientPhoneNumber = typeof params.clientId === 'string' ? decodeURIComponent(params.clientId) : undefined;

  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientPhoneNumber) {
      setIsLoading(false);
      return;
    }
    if (user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all related data (salons, hairdressers, services)
        const locationsSnap = await getDocs(collection(db, "locations"));
        setSalons(locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salon)));
        
        const hairdressersSnap = await getDocs(collection(db, "hairdressers"));
        setHairdressers(hairdressersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairdresser)));

        const servicesSnap = await getDocs(collection(db, "services"));
        setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));

        // Fetch bookings for this specific client phone number
        const bookingsQuery = query(
          collection(db, "bookings"), 
          where("clientPhone", "==", clientPhoneNumber),
          orderBy("appointmentDateTime", "desc")
        );
        const bookingSnapshot = await getDocs(bookingsQuery);
        
        const clientBookings = bookingSnapshot.docs.map(doc => {
          const data = doc.data() as BookingDoc;
          const serviceDetails = services.find(s => s.id === data.serviceId);
          return {
            id: doc.id,
            ...data,
            appointmentDateTime: (data.appointmentDateTime as Timestamp).toDate(),
            serviceName: serviceDetails?.name || "N/A",
          } as Booking;
        });
        setBookings(clientBookings);

        if (clientBookings.length > 0) {
          const firstBooking = clientBookings[0]; // Most recent due to order
          const lastBooking = clientBookings[clientBookings.length - 1]; // Oldest
          setClient({
            id: clientPhoneNumber,
            name: firstBooking.clientName,
            phone: firstBooking.clientPhone,
            email: firstBooking.clientEmail,
            totalBookings: clientBookings.length,
            firstSeen: lastBooking.appointmentDateTime,
            lastSeen: firstBooking.appointmentDateTime,
          });
        } else {
          // Try to find client info even if no bookings, perhaps from a future client list
          // For now, if no bookings, we can't derive client info this way.
          toast({ title: "Client Not Found", description: "No booking history found for this client.", variant: "destructive" });
          // Consider redirecting or showing a "not found" message within the page
        }

      } catch (error: any) {
        console.error("Error fetching client details: ", error);
        toast({ title: "Error Fetching Data", description: `Could not load client details: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, clientPhoneNumber, services]); // services added to dep array

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
        <span className="ml-2 font-body">Loading client details...</span>
      </div>
    );
  }

  if (!user && !isLoading) {
      router.replace('/login');
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (user && user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive" /><CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">You do not have permission to view client details.</CardDescription></CardContent>
          <CardFooter className="justify-center"><Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button></CardFooter>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-8">
        <PageHeader title="Client Not Found" description="Could not find client details for the provided identifier." icon={UserCircle} actions={
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
            </Button>
        }/>
        <Card className="text-center py-12 shadow-lg rounded-lg">
            <CardContent><p className="font-body text-lg text-muted-foreground">No client information available.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={client.name}
        description={`Viewing details and booking history for ${client.name}.`}
        icon={UserCircle}
        actions={
            <Button variant="outline" onClick={() => router.push('/clients')} className="font-body">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client List
            </Button>
        }
      />

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="bg-secondary/30">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={`https://placehold.co/64x64.png?text=${client.name.charAt(0)}`} alt={client.name} data-ai-hint="letter avatar"/>
                <AvatarFallback className="bg-primary/20 text-primary font-headline text-xl">
                    {client.name.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                </AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="font-headline text-2xl text-foreground">{client.name}</CardTitle>
                <CardDescription className="font-body text-muted-foreground">Client since: {client.firstSeen ? format(client.firstSeen, "MMM dd, yyyy") : "N/A"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 font-body">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-foreground">{client.phone}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-foreground">{client.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 md:col-span-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-foreground">
              Total Bookings: {client.totalBookings} | Last Visit: {client.lastSeen ? format(client.lastSeen, "MMM dd, yyyy") : "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground font-body">No bookings found for this client.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Date & Time</TableHead>
                  <TableHead className="font-headline">Service</TableHead>
                  <TableHead className="font-headline">Hairdresser</TableHead>
                  <TableHead className="font-headline">Salon</TableHead>
                  <TableHead className="font-headline">Status</TableHead>
                  <TableHead className="text-right font-headline">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="font-body">
                    <TableCell>
                      <div>{format(new Date(booking.appointmentDateTime), "MMM dd, yyyy")}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(booking.appointmentDateTime), "p")}</div>
                    </TableCell>
                    <TableCell>{booking.serviceName || services.find(s => s.id === booking.serviceId)?.name || "N/A"}</TableCell>
                    <TableCell>{getHairdresserName(booking.hairdresserId)}</TableCell>
                    <TableCell>{getSalonName(booking.salonId)}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" size="sm" asChild className="text-primary">
                        <Link href={`/bookings?edit=${booking.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
