
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking, BookingDoc, Hairdresser, HairdresserDoc, User, Salon, Service, HairdresserFormValues, DayOfWeek, HairdresserWorkingHours } from "@/lib/types";
import { Users, Mail, CalendarDays, ArrowLeft, Loader2, ShieldAlert, Edit3, Trash2, Store, Sparkles, Clock, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, serverTimestamp, deleteDoc, limit } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HairdresserForm } from "@/components/forms/HairdresserForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function HairdresserDetailPage() {
  const { user, sendPasswordReset } = useAuth();
  const router = useRouter();
  const params = useParams();
  const hairdresserId = typeof params.hairdresserId === 'string' ? params.hairdresserId : undefined;

  const [hairdresser, setHairdresser] = useState<Hairdresser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const daysOfWeek: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];


  useEffect(() => {
    if (!user || !hairdresserId) {
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
        const hairdresserDocRef = doc(db, "hairdressers", hairdresserId);
        const hairdresserDocSnap = await getDoc(hairdresserDocRef);

        if (!hairdresserDocSnap.exists()) {
          toast({ title: "Hairdresser Not Found", description: "No hairdresser record found for this ID.", variant: "destructive" });
          router.push('/hairdressers');
          return;
        }
        
        const hairdresserData = hairdresserDocSnap.data() as HairdresserDoc;
        const fetchedHairdresser: Hairdresser = {
            id: hairdresserDocSnap.id,
            userId: hairdresserData.user_id,
            name: hairdresserData.name,
            email: hairdresserData.email,
            assigned_locations: hairdresserData.assigned_locations || [],
            specialties: hairdresserData.specialties || [],
            working_days: hairdresserData.working_days || [],
            workingHours: hairdresserData.workingHours || {},
            profilePictureUrl: hairdresserData.profilePictureUrl || "",
            must_reset_password: hairdresserData.must_reset_password || false,
        };
        setHairdresser(fetchedHairdresser);

        const locationsSnap = await getDocs(collection(db, "locations"));
        const salonsList = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salon));
        setSalons(salonsList);
        
        const servicesSnap = await getDocs(collection(db, "services"));
        const servicesList = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(servicesList);

        const bookingsQuery = query(
          collection(db, "bookings"), 
          where("hairdresserId", "==", hairdresserId)
        );
        const bookingSnapshot = await getDocs(bookingsQuery);
        
        const hairdresserBookings = bookingSnapshot.docs.map(bDoc => {
          const data = bDoc.data() as BookingDoc;
          const serviceDetails = servicesList.find(s => s.id === data.serviceId);
          return {
            id: bDoc.id,
            ...data,
            appointmentDateTime: (data.appointmentDateTime as Timestamp).toDate(),
            serviceName: serviceDetails?.name || "N/A",
          } as Booking;
        });

        hairdresserBookings.sort((a, b) => b.appointmentDateTime.getTime() - a.appointmentDateTime.getTime());
        
        setBookings(hairdresserBookings);

      } catch (error: any) {
        console.error("Error fetching hairdresser details: ", error);
        toast({ title: "Error Fetching Data", description: `Could not load hairdresser details: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, hairdresserId, router]);
  
  const handleUpdateHairdresser = async (data: HairdresserFormValues) => {
    if (!hairdresser) return;
    setIsSubmitting(true);
    
    const workingDays: DayOfWeek[] = [];
    if (data.workingHours) {
        for (const day of daysOfWeek) {
            const hours = data.workingHours[day];
            if (hours && !hours.isOff) {
                workingDays.push(day);
            }
        }
    }
    
    const hairdresserRef = doc(db, "hairdressers", hairdresser.id);
    const updateData: Partial<HairdresserDoc> = {
      name: data.name,
      assigned_locations: data.assigned_locations,
      specialties: data.specialties.split(",").map(s => s.trim()).filter(s => s),
      working_days: workingDays,
      workingHours: data.workingHours || {},
      profilePictureUrl: data.profilePictureUrl || "",
      updatedAt: serverTimestamp() as Timestamp,
    };

    try {
      await updateDoc(hairdresserRef, updateData);
      setHairdresser(prev => prev ? { ...prev, ...updateData, updatedAt: Timestamp.now() } as Hairdresser : null);
      toast({ title: "Hairdresser Updated", description: `${data.name} has been updated.` });
      setIsEditFormOpen(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: "Could not update hairdresser.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!hairdresser?.email) {
        toast({ title: "Error", description: "Hairdresser email not found.", variant: "destructive" });
        return;
    }
    setIsResettingPassword(true);
    try {
        const success = await sendPasswordReset(hairdresser.email);
        if (success) {
            toast({
                title: "Password Reset Sent",
                description: `A password reset link has been sent to ${hairdresser.name}.`,
            });
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to send password reset link.", variant: "destructive" });
    } finally {
        setIsResettingPassword(false);
    }
  };

  const handleDeleteHairdresser = async () => {
    if (!hairdresser) return;
    setIsSubmitting(true);
    try {
      // Safety check: ensure no bookings are associated with this hairdresser
      const bookingsQuery = query(collection(db, "bookings"), where("hairdresserId", "==", hairdresser.id), limit(1));
      const bookingSnapshot = await getDocs(bookingsQuery);

      if (!bookingSnapshot.empty) {
        toast({
          title: "Deletion Blocked",
          description: "This hairdresser has associated bookings. Reassign or cancel them before deleting.",
          variant: "destructive",
          duration: 7000,
        });
        setIsSubmitting(false);
        return;
      }
      
      // If safe, proceed with deletion
      await deleteDoc(doc(db, "hairdressers", hairdresser.id)); 
      toast({ 
        title: "Hairdresser Profile Deleted", 
        description: `Profile for ${hairdresser.name} deleted. Their auth account will be removed automatically.`,
        variant: "default" 
      });
      router.push('/hairdressers');
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: `Could not delete profile: ${error.message}`, variant: "destructive" });
        setIsSubmitting(false);
    }
  };

  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "N/A";

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
        <span className="ml-2 font-body">Loading hairdresser details...</span>
      </div>
    );
  }

  if (user && user.role !== 'admin' && !isLoading) {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive" /><CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">You do not have permission to view these details.</CardDescription></CardContent>
          <CardFooter className="justify-center"><Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button></CardFooter>
        </Card>
      </div>
    );
  }

  if (!hairdresser) {
    return (
      <div className="space-y-8">
        <PageHeader title="Hairdresser Not Found" description="Could not find details for the provided identifier." icon={Users} actions={
             <Button variant="outline" onClick={() => router.push('/hairdressers')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hairdresser List
            </Button>
        }/>
      </div>
    );
  }

  const hairdresserInitials = hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase() || "?";

  return (
    <div className="space-y-8">
      <PageHeader
        title={hairdresser.name}
        description={`Viewing profile and booking history for ${hairdresser.name}.`}
        icon={Users}
        actions={
            <Button variant="outline" onClick={() => router.push('/hairdressers')} className="font-body">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hairdresser List
            </Button>
        }
      />

      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
          <DialogContent className="sm:max-w-2xl font-body max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-headline text-2xl">Edit Hairdresser Profile</DialogTitle></DialogHeader>
          <HairdresserForm
              initialData={hairdresser}
              salons={salons}
              onSubmit={handleUpdateHairdresser}
              isEditing={true}
              isLoading={isSubmitting}
              />
          </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column for Profile */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader className="bg-secondary/30">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage src={hairdresser.profilePictureUrl} alt={hairdresser.name} data-ai-hint="person portrait"/>
                        <AvatarFallback className="bg-primary/20 text-primary font-headline text-xl">
                            {hairdresserInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="font-headline text-2xl text-foreground">{hairdresser.name}</CardTitle>
                        {hairdresser.must_reset_password && <Badge variant="destructive" className="text-xs my-1">Password Reset Required</Badge>}
                    </div>
                </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3 font-body text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><span className="text-foreground">{hairdresser.email}</span></div>
                    <div className="flex items-start gap-2"><Store className="h-5 w-5 text-primary shrink-0" /><div><strong className="font-medium">Salons:</strong><div className="flex flex-wrap mt-1">{hairdresser.assigned_locations.map(id => {const salon = salons.find(s=>s.id===id); return <Badge key={id} variant="secondary" className="mr-1 mb-1">{salon?.name || 'Unknown'}</Badge>})}</div></div></div>
                    <div className="flex items-start gap-2"><Sparkles className="h-5 w-5 text-primary shrink-0" /><div><strong className="font-medium">Specialties:</strong> {hairdresser.specialties?.join(", ") || "N/A"}</div></div>
                    
                    <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-medium">Working Hours:</strong>
                            {hairdresser.workingHours ? (
                                <ul className="mt-1 space-y-1 text-xs">
                                {daysOfWeek.map((day) => {
                                    const hours = hairdresser.workingHours?.[day];
                                    return (
                                    <li key={day} className="flex justify-between items-center">
                                        <span className="w-12 text-muted-foreground">{day.substring(0, 3)}:</span>
                                        {hours && !hours.isOff && hours.start && hours.end ? (
                                        <span className="font-mono text-foreground text-right flex-1">{hours.start} - {hours.end}</span>
                                        ) : (
                                        <span className="text-muted-foreground/70 text-right flex-1">Day Off</span>
                                        )}
                                    </li>
                                    );
                                })}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-xs mt-1">Not Set</p>
                            )}
                        </div>
                    </div>

                </CardContent>
                  <CardFooter className="border-t flex justify-end gap-2 p-4">
                    <Button variant="outline" onClick={() => setIsEditFormOpen(true)} disabled={isSubmitting || isResettingPassword}><Edit3 className="mr-2 h-4 w-4"/>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" disabled={isSubmitting || isResettingPassword}><KeyRound className="mr-2 h-4 w-4"/>Reset Password</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-headline">Reset Password for {hairdresser.name}?</AlertDialogTitle>
                                <AlertDialogDescription className="font-body">This will send a password reset link to {hairdresser.email}. They will be able to set a new password by following the link. Are you sure?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter> 
                                <AlertDialogCancel disabled={isResettingPassword}>Cancel</AlertDialogCancel> 
                                <AlertDialogAction onClick={handlePasswordReset} className="bg-primary hover:bg-primary/90" disabled={isResettingPassword}>
                                    {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin"/> : "Send Reset Link"}
                                </AlertDialogAction> 
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isSubmitting || isResettingPassword}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader> <AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle> <AlertDialogDescription className="font-body"> This will permanently delete the profile for "{hairdresser.name}" and their associated login account. This action cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
                        <AlertDialogFooter> 
                            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel> 
                            <AlertDialogAction onClick={handleDeleteHairdresser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm Delete"}
                            </AlertDialogAction> 
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
            </Card>
        </div>

        {/* Right Column for Booking History */}
        <div className="lg:col-span-2">
            <Card className="shadow-lg rounded-lg">
                <CardHeader><CardTitle className="font-headline">Booking History ({bookings.length})</CardTitle></CardHeader>
                <CardContent>
                {bookings.length === 0 ? (
                    <p className="text-muted-foreground font-body text-center py-8">No bookings found for this hairdresser.</p>
                ) : (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="font-headline">Date & Time</TableHead>
                        <TableHead className="font-headline">Client</TableHead>
                        <TableHead className="font-headline">Service</TableHead>
                        <TableHead className="font-headline">Salon</TableHead>
                        <TableHead className="font-headline">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map((booking) => (
                        <TableRow key={booking.id} className="font-body">
                            <TableCell>
                            <div>{format(new Date(booking.appointmentDateTime), "MMM dd, yyyy")}</div>
                            <div className="text-sm text-muted-foreground">{format(new Date(booking.appointmentDateTime), "p")}</div>
                            </TableCell>
                            <TableCell>{booking.clientName}</TableCell>
                            <TableCell>{booking.serviceName}</TableCell>
                            <TableCell>{getSalonName(booking.salonId)}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
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
