
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Hairdresser, Salon, DayOfWeek, User, LocationDoc, HairdresserDoc } from "@/lib/types";
import { Users, PlusCircle, Edit3, Trash2, Store, Sparkles, Clock, ShieldAlert, Mail, Loader2 } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { db, collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from "@/lib/firebase";

export default function HairdressersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingHairdresser, setEditingHairdresser] = useState<Hairdresser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial data loading
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions and deletions

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Salons
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({ 
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        setSalons(salonsList);

        // Fetch Hairdressers
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
        setHairdressers(hairdressersList.sort((a,b) => a.name.localeCompare(b.name)));

      } catch (error) {
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

  if (user.role !== 'admin') {
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

  const handleUpdateHairdresser = async (data: HairdresserFormValues) => {
    if (!editingHairdresser) return;
    setIsSubmitting(true);
    
    // Simple parsing of working_days from availability string for consistency with creation.
    // This is a basic example; you might want more robust parsing based on your 'availability' format.
    const parsedWorkingDays: DayOfWeek[] = [];
    if (data.availability.toLowerCase().includes("mon")) parsedWorkingDays.push("Monday");
    if (data.availability.toLowerCase().includes("tue")) parsedWorkingDays.push("Tuesday");
    if (data.availability.toLowerCase().includes("wed")) parsedWorkingDays.push("Wednesday");
    if (data.availability.toLowerCase().includes("thu")) parsedWorkingDays.push("Thursday");
    if (data.availability.toLowerCase().includes("fri")) parsedWorkingDays.push("Friday");
    if (data.availability.toLowerCase().includes("sat")) parsedWorkingDays.push("Saturday");
    if (data.availability.toLowerCase().includes("sun")) parsedWorkingDays.push("Sunday");


    const hairdresserRef = doc(db, "hairdressers", editingHairdresser.id);
    const updateData: Partial<HairdresserDoc> = {
      name: data.name,
      // email: data.email, // Email change is complex, typically not done here
      assigned_locations: data.assigned_locations,
      specialties: data.specialties.split(",").map(s => s.trim()).filter(s => s),
      availability: data.availability,
      working_days: parsedWorkingDays, // Update working_days based on availability string
      profilePictureUrl: data.profilePictureUrl || "",
      updatedAt: serverTimestamp() as Timestamp, // Use serverTimestamp for updates
    };

    try {
      await updateDoc(hairdresserRef, updateData);
      setHairdressers(prev => prev.map(h => 
        h.id === editingHairdresser.id ? { 
            ...h, 
            name: data.name,
            assigned_locations: data.assigned_locations,
            specialties: data.specialties.split(",").map(s => s.trim()).filter(s => s),
            availability: data.availability,
            working_days: parsedWorkingDays,
            profilePictureUrl: data.profilePictureUrl || "",
            updatedAt: Timestamp.now() // For optimistic UI update, actual value is server-generated
        } : h 
      ).sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Hairdresser Updated", description: `${data.name} has been updated.` });
      setIsEditFormOpen(false);
      setEditingHairdresser(null);
    } catch (error) {
      console.error("Error updating hairdresser:", error);
      toast({ title: "Update Failed", description: "Could not update hairdresser.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHairdresser = async (hairdresserToDelete: Hairdresser) => {
    setIsSubmitting(true);
    try {
      // TODO: This only deletes the Firestore doc from 'hairdressers'.
      // A full deletion requires a Firebase Function to delete the Auth user and 'users' doc.
      // For now, we only delete the hairdresser profile document.
      await deleteDoc(doc(db, "hairdressers", hairdresserToDelete.id));
      
      // Also attempt to delete the user document from 'users' collection if the ID matches.
      // This is still not a full cleanup but better than just deleting the hairdresser profile.
      try {
        await deleteDoc(doc(db, "users", hairdresserToDelete.userId)); // userId is the Auth UID
        toast({ title: "Hairdresser Record Deleted", description: `Firestore records for ${hairdresserToDelete.name} deleted. Full Firebase Auth user deletion requires a Cloud Function.`, variant: "default" });
      } catch (userDocError) {
         toast({ title: "Hairdresser Profile Deleted", description: `Profile for ${hairdresserToDelete.name} deleted. Could not delete 'users' record. Full Firebase Auth user deletion needs a Cloud Function.`, variant: "destructive" });
        console.error("Error deleting user document from 'users' collection:", userDocError);
      }

      setHairdressers(prev => prev.filter(h => h.id !== hairdresserToDelete.id));

    } catch (error) {
        console.error("Error deleting hairdresser Firestore record:", error);
        toast({ title: "Deletion Failed", description: "Could not delete hairdresser record.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const openEditForm = (hairdresserToEdit: Hairdresser) => {
    setEditingHairdresser(hairdresserToEdit);
    setIsEditFormOpen(true);
  };
  
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
        description="Manage your talented team of hairdressers."
        icon={Users}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/hairdressers/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Hairdresser
            </Link>
          </Button>
        }
      />

      <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => { setIsEditFormOpen(isOpen); if (!isOpen) setEditingHairdresser(null); }}>
        <DialogContent className="sm:max-w-lg font-body">
          <DialogHeader> <DialogTitle className="font-headline text-2xl">Edit Hairdresser Profile</DialogTitle> </DialogHeader>
          {editingHairdresser && (
            <HairdresserForm
              initialData={editingHairdresser}
              salons={salons} 
              onSubmit={handleUpdateHairdresser}
              isEditing={true}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hairdressers.map((hairdresser) => (
            <Card key={hairdresser.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 bg-secondary/30 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary shrink-0">
                  <AvatarImage src={hairdresser.profilePictureUrl} alt={hairdresser.name} data-ai-hint="person portrait"/>
                  <AvatarFallback className="bg-primary/30 text-primary font-headline"> {hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase()} </AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <CardTitle className="font-headline text-xl text-foreground">{hairdresser.name}</CardTitle>
                  <div className="font-body text-primary flex items-center gap-1 mt-1"> <Store size={14}/> Salons: </div>
                  <div className="flex flex-wrap mt-1">
                    {getSalonBadges(hairdresser.assigned_locations)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 font-body flex-grow p-4">
                 {hairdresser.email && ( <div className="flex items-start text-sm"> <Mail className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Email: </strong> {hairdresser.email} </div> </div> )}
                 {hairdresser.must_reset_password && <Badge variant="destructive" className="text-xs mt-1">Password Reset Required</Badge>}
                <div className="flex items-start text-sm"> <Sparkles className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Specialties: </strong> {hairdresser.specialties.join(", ")} </div> </div>
                <div className="flex items-start text-sm"> <Clock className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Availability: </strong> {hairdresser.availability} </div> </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                <Button variant="outline" size="sm" onClick={() => openEditForm(hairdresser)} className="font-body" disabled={isSubmitting}> <Edit3 className="mr-2 h-4 w-4" /> Edit </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="font-body" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader> <AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle> <AlertDialogDescription className="font-body"> This action will delete the Firestore record for "{hairdresser.name}". Full user deletion (Auth & 'users' record) requires a separate Cloud Function. </AlertDialogDescription> </AlertDialogHeader>
                    <AlertDialogFooter> 
                        <AlertDialogCancel className="font-body" disabled={isSubmitting}>Cancel</AlertDialogCancel> 
                        <AlertDialogAction onClick={() => handleDeleteHairdresser(hairdresser)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body" disabled={isSubmitting}> 
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete Records"}
                        </AlertDialogAction> 
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
