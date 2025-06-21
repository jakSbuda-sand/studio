
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Booking, BookingDoc, Client, ClientDoc, User, Salon, Hairdresser, Service } from "@/lib/types";
import { UserCircle, Phone, Mail, CalendarDays, ArrowLeft, Loader2, ShieldAlert, Edit3, Save, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, serverTimestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

export default function ClientDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = typeof params.clientId === 'string' ? params.clientId : undefined;

  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);


  useEffect(() => {
    if (!user || !clientId) {
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
        // Fetch client details
        const clientDocRef = doc(db, "clients", clientId);
        const clientDocSnap = await getDoc(clientDocRef);

        if (!clientDocSnap.exists()) {
          toast({ title: "Client Not Found", description: "No client record found for this ID.", variant: "destructive" });
          router.push('/clients');
          return;
        }
        const clientData = clientDocSnap.data() as ClientDoc;
        const fetchedClient = { id: clientDocSnap.id, ...clientData } as Client;
        setClient(fetchedClient);
        setClientNotes(fetchedClient.notes || "");

        // Fetch related data for bookings (salons, hairdressers, services)
        const locationsSnap = await getDocs(collection(db, "locations"));
        setSalons(locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salon)));
        
        const hairdressersSnap = await getDocs(collection(db, "hairdressers"));
        setHairdressers(hairdressersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hairdresser)));

        const servicesSnap = await getDocs(collection(db, "services"));
        const servicesList = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(servicesList);


        // Fetch bookings for this specific client phone number
        const bookingsQuery = query(
          collection(db, "bookings"), 
          where("clientPhone", "==", clientData.phone), // Use phone from fetched clientData
          orderBy("appointmentDateTime", "desc")
        );
        const bookingSnapshot = await getDocs(bookingsQuery);
        
        const clientBookings = bookingSnapshot.docs.map(doc => {
          const data = doc.data() as BookingDoc;
          const serviceDetails = servicesList.find(s => s.id === data.serviceId); // Use servicesList
          return {
            id: doc.id,
            ...data,
            appointmentDateTime: (data.appointmentDateTime as Timestamp).toDate(),
            serviceName: serviceDetails?.name || "N/A",
          } as Booking;
        });
        setBookings(clientBookings);

      } catch (error: any) {
        console.error("Error fetching client details: ", error);
        toast({ title: "Error Fetching Data", description: `Could not load client details: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, clientId, router]);

  const handleSaveNotes = async () => {
    if (!client) return;
    setIsSavingNotes(true);
    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, {
        notes: clientNotes,
        updatedAt: serverTimestamp(),
      });
      setClient(prev => prev ? { ...prev, notes: clientNotes, updatedAt: Timestamp.now() } : null);
      setIsEditingNotes(false);
      toast({ title: "Notes Updated", description: "Client notes saved successfully." });
    } catch (error: any) {
      console.error("Error saving client notes: ", error);
      toast({ title: "Error Saving Notes", description: `Could not save notes: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSavingNotes(false);
    }
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
             <Button variant="outline" onClick={() => router.push('/clients')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client List
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
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
                        <CardDescription className="font-body text-muted-foreground">
                            Client since: {client.firstSeen ? format(client.firstSeen.toDate(), "MMM dd, yyyy") : "N/A"}
                        </CardDescription>
                    </div>
                </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3 font-body">
                    <div className="flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /><span className="text-foreground">{client.phone}</span></div>
                    {client.email && (<div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><span className="text-foreground">{client.email}</span></div>)}
                    <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><span className="text-foreground">Total Bookings: {client.totalBookings}</span></div>
                    <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><span className="text-foreground">Last Visit: {client.lastSeen ? format(client.lastSeen.toDate(), "MMM dd, yyyy") : "N/A"}</span></div>
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline text-xl flex items-center gap-2"><FileText className="text-primary"/>Client Notes</CardTitle>
                        {!isEditingNotes && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}><Edit3 className="mr-2 h-4 w-4"/>Edit</Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditingNotes ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveNotes();}} className="space-y-3">
                            <Label htmlFor="clientNotes" className="sr-only">Client Notes</Label>
                            <Textarea
                                id="clientNotes"
                                value={clientNotes}
                                onChange={(e) => setClientNotes(e.target.value)}
                                placeholder="Add notes about this client..."
                                rows={5}
                                className="font-body"
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => { setIsEditingNotes(false); setClientNotes(client.notes || "");}} disabled={isSavingNotes}>Cancel</Button>
                                <Button type="submit" disabled={isSavingNotes}>
                                    {isSavingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Save Notes
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-sm text-muted-foreground font-body whitespace-pre-wrap min-h-[60px]">
                            {client.notes || "No notes added yet."}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card className="shadow-lg rounded-lg">
                <CardHeader><CardTitle className="font-headline">Booking History</CardTitle></CardHeader>
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
      </div>
    </div>
  );
}
