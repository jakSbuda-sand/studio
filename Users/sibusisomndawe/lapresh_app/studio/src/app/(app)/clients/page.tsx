
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Booking, BookingDoc, Client, User } from "@/lib/types";
import { Contact, Users, Eye, Loader2, ShieldAlert, CalendarSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, query, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchClientsFromBookings = async () => {
      setIsLoading(true);
      try {
        const bookingsCol = collection(db, "bookings");
        const bookingsQuery = query(bookingsCol, orderBy("appointmentDateTime", "desc"));
        const bookingSnapshot = await getDocs(bookingsQuery);
        
        const bookingsData = bookingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as BookingDoc),
          appointmentDateTime: (doc.data().appointmentDateTime as Timestamp).toDate() // Convert Timestamp to Date
        } as Booking));

        const clientMap = new Map<string, Client>();

        bookingsData.forEach(booking => {
          const clientId = booking.clientPhone; // Using phone as unique ID for now
          if (!clientId) return; // Skip if no phone number

          if (clientMap.has(clientId)) {
            const existingClient = clientMap.get(clientId)!;
            existingClient.totalBookings += 1;
            if (booking.appointmentDateTime > existingClient.lastSeen!) {
              existingClient.lastSeen = booking.appointmentDateTime;
            }
            if (booking.appointmentDateTime < existingClient.firstSeen!) {
              existingClient.firstSeen = booking.appointmentDateTime;
            }
          } else {
            clientMap.set(clientId, {
              id: clientId,
              name: booking.clientName,
              phone: booking.clientPhone,
              email: booking.clientEmail,
              totalBookings: 1,
              firstSeen: booking.appointmentDateTime,
              lastSeen: booking.appointmentDateTime,
            });
          }
        });
        
        const derivedClients = Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setClients(derivedClients);

      } catch (error: any) {
        console.error("Error fetching client data: ", error);
        toast({ title: "Error Fetching Clients", description: `Could not load client data: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientsFromBookings();
  }, [user]);

  if (!user && !isLoading) {
      router.replace('/login');
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-body">Loading clients...</span>
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive" /><CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">You do not have permission to view client data.</CardDescription></CardContent>
          <CardFooter className="justify-center"><Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button></CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Management"
        description="View and manage client information and their booking history."
        icon={Contact}
      />

      {clients.length === 0 ? (
        <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader><CalendarSearch className="mx-auto h-16 w-16 text-muted-foreground" /><CardTitle className="mt-4 text-2xl font-headline">No Client Data Found</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">No bookings have been made yet, so no client data is available.</CardDescription></CardContent>
        </Card>
      ) : (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Client List</CardTitle>
          <CardDescription className="font-body">A list of clients derived from booking records.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline w-[80px]">Avatar</TableHead>
                <TableHead className="font-headline">Name</TableHead>
                <TableHead className="font-headline">Contact</TableHead>
                <TableHead className="font-headline text-center">Total Bookings</TableHead>
                <TableHead className="font-headline">Last Appointment</TableHead>
                <TableHead className="text-right font-headline">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="font-body">
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${client.name.charAt(0)}`} alt={client.name} data-ai-hint="letter avatar" />
                      <AvatarFallback className="bg-primary/20 text-primary font-headline">
                        {client.name.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                  <TableCell>
                    <div>{client.phone}</div>
                    {client.email && <div className="text-xs text-muted-foreground">{client.email}</div>}
                  </TableCell>
                  <TableCell className="text-center">{client.totalBookings}</TableCell>
                  <TableCell>{client.lastSeen ? format(client.lastSeen, "MMM dd, yyyy") : "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild className="hover:bg-accent/80">
                      <Link href={`/clients/${encodeURIComponent(client.id)}`}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </Link>
                    </Button>
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
