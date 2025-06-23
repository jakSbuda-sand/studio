"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Hairdresser, Salon, DayOfWeek, User, LocationDoc, HairdresserDoc, HairdresserWorkingHours } from "@/lib/types";
import { Users, PlusCircle, Store, Sparkles, Clock, ShieldAlert, Mail, Loader2, CalendarDays, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { db, collection, getDocs } from "@/lib/firebase";

const formatWorkingHours = (workingHours?: HairdresserWorkingHours): string => {
  if (!workingHours) return "Not set";
  const days: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const parts: string[] = [];
  days.forEach(day => {
    const wh = workingHours[day];
    if (wh) {
      if (wh.isOff) {
        // Omitting 'Off' days for a cleaner look
      } else if (wh.start && wh.end) {
        parts.push(`${day.substring(0,3)}: ${wh.start}-${wh.end}`);
      }
    }
  });
  return parts.length > 0 ? parts.join(" | ") : "Not set";
};


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
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        const hairdressersListPromises = hairdresserSnapshot.docs.map(async hDoc => { 
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
            workingHours: data.workingHours || {},
            profilePictureUrl: data.profilePictureUrl || "",
            must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt, 
            updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        const hairdressersList = await Promise.all(hairdressersListPromises);
        setHairdressers(hairdressersList.sort((a,b) => a.name.localeCompare(b.name)));

      } catch (error: any) {
        console.error("Error fetching data: ", error);
        toast({ title: "Error Fetching Data", description: "Could not load hairdressers or salons.", variant: "destructive" });
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
  
  const getSalonBadges = (locationIds: string[]) => {
    if (!locationIds || locationIds.length === 0) return <Badge variant="outline" className="font-body">Not Assigned</Badge>;
    return locationIds.map(id => {
        const salon = salons.find(s => s.id === id);
        return salon ? <Badge key={id} variant="secondary" className="mr-1 mb-1 font-body">{salon.name}</Badge> : null;
    }).filter(Boolean);
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading hairdressers...</span>
        </div>
      );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hairdresser Management"
        description="View your talented team of hairdressers."
        icon={Users}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/hairdressers/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Hairdresser
            </Link>
          </Button>
        }
      />

      {hairdressers.length === 0 && !isLoading ? ( 
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {hairdressers.map((hairdresser) => (
            <Card key={hairdresser.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 bg-secondary/30 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary shrink-0">
                  <AvatarImage src={hairdresser.profilePictureUrl} alt={hairdresser.name} data-ai-hint="person portrait"/>
                  <AvatarFallback className="bg-primary/30 text-primary font-headline"> {hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase()} </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <CardTitle className="font-headline text-xl text-foreground">{hairdresser.name}</CardTitle>
                   {hairdresser.must_reset_password && <Badge variant="destructive" className="text-xs my-1">Password Reset Required</Badge>}
                  <div className="font-body text-primary flex items-center gap-1 mt-1"> <Store size={14}/> Salons: </div>
                  <div className="flex flex-wrap mt-1">
                    {getSalonBadges(hairdresser.assigned_locations)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 font-body flex-grow p-4 text-sm">
                 {hairdresser.email && ( <div className="flex items-start"> <Mail className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Email: </strong> {hairdresser.email} </div> </div> )}
                <div className="flex items-start"> <Sparkles className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Specialties: </strong> {hairdresser.specialties.join(", ") || "N/A"} </div> </div>
                <div className="flex items-start"> <CalendarDays className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Working Hours: </strong> {formatWorkingHours(hairdresser.workingHours)} </div> </div>
              </CardContent>
              <CardFooter className="border-t mt-auto pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                 <Button asChild variant="outline" size="sm" className="font-body w-full">
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
