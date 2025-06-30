
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Hairdresser, Salon, User, LocationDoc, HairdresserDoc } from "@/lib/types";
import { Users, PlusCircle, ShieldAlert, Mail, Loader2, Eye, Sparkles, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { db, collection, getDocs, query, orderBy } from "@/lib/firebase";


export default function HairdressersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({ 
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        setSalons(salonsList);

        const hairdressersCol = collection(db, "hairdressers");
        const hairdressersQuery = query(hairdressersCol, orderBy("name", "asc"));
        const hairdresserSnapshot = await getDocs(hairdressersQuery);
        
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => { 
          const data = hDoc.data() as HairdresserDoc;
          return {
            id: hDoc.id, 
            userId: data.userId, 
            name: data.name,
            email: data.email, 
            assignedLocations: data.assignedLocations || [],
            specialties: data.specialties || [],
            workingDays: data.workingDays || [],
            workingHours: data.workingHours || {},
            profilePictureUrl: data.profilePictureUrl || "",
            must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt, 
            updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        setHairdressers(hairdressersList);

      } catch (error: any) {
        console.error("Error fetching data: ", error);
        toast({ title: "Error Fetching Data", description: `Could not load hairdressers' details. ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  if (!user || user.role === 'unknown') return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading user...</span></div>;

  if (user.role !== 'admin' && !isLoading) { 
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader> <ShieldAlert className="mx-auto h-16 w-16 text-destructive" /> <CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle> </CardHeader>
          <CardContent> <CardDescription className="font-body text-lg"> You do not have permission to manage hairdresser profiles. </CardDescription> </CardContent>
          <CardFooter className="justify-center"> <Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground"> Go to Dashboard </Button> </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 font-body">Loading hairdressers...</span>
        </div>
      );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hairdresser Management"
        description="View and manage your talented team of hairdressers."
        icon={Users}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/hairdressers/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Hairdresser
            </Link>
          </Button>
        }
      />

      {hairdressers.length === 0 ? ( 
        <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader> <Users className="mx-auto h-16 w-16 text-muted-foreground" /> <CardTitle className="mt-4 text-2xl font-headline">No Hairdressers Yet</CardTitle> </CardHeader>
          <CardContent> <CardDescription className="font-body text-lg"> Add your first hairdresser to assign them to salons and manage their schedules. </CardDescription> </CardContent>
          <CardFooter className="justify-center"> 
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/hairdressers/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add First Hairdresser
                </Link>
            </Button>
           </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hairdressers.map((hairdresser) => (
            <Card key={hairdresser.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col rounded-lg overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-4 bg-secondary/30 p-4">
                     <Avatar className="h-14 w-14 border-2 border-primary">
                        <AvatarImage src={hairdresser.profilePictureUrl} alt={hairdresser.name} data-ai-hint="person portrait"/>
                        <AvatarFallback className="bg-primary/20 text-primary font-headline">
                            {hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <CardTitle className="font-headline text-lg">{hairdresser.name}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1.5"><Mail size={12}/>{hairdresser.email}</CardDescription>
                        {hairdresser.must_reset_password && <Badge variant="destructive" className="text-xs mt-1">Password Reset Required</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-grow font-body text-sm">
                    <div className="flex items-start gap-2">
                        <Store size={14} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {hairdresser.assignedLocations?.length > 0
                            ? hairdresser.assignedLocations.map(id => {
                                const salon = salons.find(s => s.id === id);
                                return salon ? <Badge key={id} variant="secondary">{salon.name}</Badge> : null;
                              })
                            : <Badge variant="outline">Not Assigned</Badge>
                          }
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0"/>
                        <p className="text-muted-foreground leading-snug">{hairdresser.specialties?.join(", ") || "No specialties listed."}</p>
                    </div>
                </CardContent>
                 <CardFooter className="border-t p-3 bg-muted/20 flex justify-end">
                    <Button variant="outline" size="sm" asChild className="hover:bg-accent/80 font-body">
                        <Link href={`/hairdressers/${hairdresser.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
