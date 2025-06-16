
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Client, ClientDoc, User } from "@/lib/types";
import { Contact, Eye, Loader2, ShieldAlert, UserSearch, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, query, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const clientsCol = collection(db, "clients");
        // For more advanced search, you might need more complex queries or a search service
        const clientsQuery = query(clientsCol, orderBy("name", "asc"));
        const clientSnapshot = await getDocs(clientsQuery);
        
        const clientsList = clientSnapshot.docs.map(doc => {
          const data = doc.data() as ClientDoc;
          return {
            id: doc.id,
            ...data,
            // Timestamps are already Timestamps from Firestore, convert to Date for UI if needed
            firstSeen: data.firstSeen, // Keep as Timestamp for now, format on display
            lastSeen: data.lastSeen,   // Keep as Timestamp for now, format on display
          } as Client;
        });
        
        setAllClients(clientsList);
        setFilteredClients(clientsList);

      } catch (error: any) {
        console.error("Error fetching client data: ", error);
        toast({ title: "Error Fetching Clients", description: `Could not load client data: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allClients.filter(client => {
      return (
        client.name.toLowerCase().includes(lowercasedFilter) ||
        client.phone.includes(lowercasedFilter) ||
        (client.email && client.email.toLowerCase().includes(lowercasedFilter))
      );
    });
    setFilteredClients(filteredData);
  }, [searchTerm, allClients]);


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
       <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2"><UserSearch /> Search Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-full font-body"
          />
        </CardContent>
      </Card>

      {filteredClients.length === 0 ? (
        <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader><Users className="mx-auto h-16 w-16 text-muted-foreground" /><CardTitle className="mt-4 text-2xl font-headline">No Clients Found</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">{searchTerm ? "No clients match your search criteria." : "No clients have been added yet."}</CardDescription></CardContent>
        </Card>
      ) : (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Client List</CardTitle>
          <CardDescription className="font-body">A list of all registered clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline w-[80px]">Avatar</TableHead>
                <TableHead className="font-headline">Name</TableHead>
                <TableHead className="font-headline">Contact</TableHead>
                <TableHead className="font-headline text-center">Total Bookings</TableHead>
                <TableHead className="font-headline">Last Visit</TableHead>
                <TableHead className="text-right font-headline">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
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
                  <TableCell>{client.lastSeen ? format(client.lastSeen.toDate(), "MMM dd, yyyy") : "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild className="hover:bg-accent/80">
                      <Link href={`/clients/${client.id}`}>
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
