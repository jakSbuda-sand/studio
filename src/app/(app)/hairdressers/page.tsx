
"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // Import Link
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // DialogTrigger still needed for Edit
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Hairdresser, Salon, DayOfWeek, User } from "@/lib/types";
import { Users, PlusCircle, Edit3, Trash2, Store, Sparkles, Clock, ShieldAlert, Mail } from "lucide-react";
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
// import { functions, httpsCallable } from "@/lib/firebase"; // For Cloud Function call (delete only for now)

// Mock Data (replace with Firestore fetches)
const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand", phone: "011 555 1234", operatingHours: "Mon-Fri: 9am-6pm, Sat: 9am-4pm" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg", phone: "011 555 5678", operatingHours: "Tue-Sat: 8am-7pm, Sun: 10am-3pm" },
];

const initialMockHairdressers: Hairdresser[] = [
  // This will be replaced by Firestore data
  { id: "mock-h1", userId: "mock-uid1", name: "Alice Smith (Mock)", salonId: "1", assigned_locations: ["1"], specialties: ["Cutting", "Coloring"], availability: "Mon-Fri 9am-5pm", working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], profilePictureUrl: "https://placehold.co/100x100.png?text=AS", email: "alice.mock@salonverse.com", color_code: "#FFB3D9", must_reset_password: false },
  { id: "mock-h2", userId: "mock-uid2", name: "Bob Johnson (Mock)", salonId: "2", assigned_locations: ["2"], specialties: ["Styling", "Men's Cuts"], availability: "Tue-Sat 10am-6pm", working_days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], profilePictureUrl: "https://placehold.co/100x100.png?text=BJ", email: "bob.mock@salonverse.com", color_code: "#D0B8FF", must_reset_password: false },
];


export default function HairdressersPage() {
  const { user } = useAuth(); // AuthContext user
  const router = useRouter();
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>(initialMockHairdressers); // Replace with Firestore state
  const [salons] = useState<Salon[]>(mockSalonsData); // Replace with Firestore state
  const [isEditFormOpen, setIsEditFormOpen] = useState(false); // Renamed for clarity, specifically for edit dialog
  const [editingHairdresser, setEditingHairdresser] = useState<Hairdresser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: useEffect to fetch hairdressers from Firestore when component mounts and user is admin

  if (!user || user.role === 'unknown') return <p>Loading...</p>; // Or a skeleton loader

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

  // handleAddHairdresser is removed, it will be in /hairdressers/new/page.tsx

  const handleUpdateHairdresser = async (data: HairdresserFormValues) => {
    if (!editingHairdresser) return;
    setIsLoading(true);
    console.log("Updating hairdresser (Firestore logic needed):", editingHairdresser.id, data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedMockHairdresser: Hairdresser = {
      ...editingHairdresser,
      name: data.name,
      // email: data.email, // Email shouldn't be changed this way usually
      salonId: data.salonId,
      assigned_locations: [data.salonId],
      specialties: data.specialties.split(",").map(s => s.trim()),
      availability: data.availability, 
      working_days: data.availability.split(',').map(d => d.trim() as DayOfWeek), // Basic parsing, refine
      profilePictureUrl: data.profilePictureUrl || editingHairdresser.profilePictureUrl,
      // color_code: data.color_code || editingHairdresser.color_code, // color_code removed from form
    };
    setHairdressers(prev => prev.map(h => h.id === editingHairdresser.id ? updatedMockHairdresser : h));
    toast({ title: "Hairdresser Updated (Simulation)", description: `${data.name} has been updated.` });
    setIsEditFormOpen(false);
    setEditingHairdresser(null);
    setIsLoading(false);
  };

  const handleDeleteHairdresser = async (hairdresserToDelete: Hairdresser) => {
    setIsLoading(true);
    console.log("Deleting hairdresser (Cloud Function logic needed):", hairdresserToDelete.id, hairdresserToDelete.userId);
    // Placeholder for actual deletion
    // const deleteHairdresserFn = httpsCallable(functions, 'deleteHairdresserUser');
    // await deleteHairdresserFn({ userId: hairdresser.userId, hairdresserDocId: hairdresser.id });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setHairdressers(prev => prev.filter(h => h.id !== hairdresserToDelete.id));
    toast({ title: "Hairdresser Deleted (Simulation)", description: `Hairdresser ${hairdresserToDelete.name} has been removed. Real deletion requires a Cloud Function.`, variant: "destructive" });
    setIsLoading(false);
  };

  const openEditForm = (hairdresserToEdit: Hairdresser) => {
    setEditingHairdresser(hairdresserToEdit);
    setIsEditFormOpen(true);
  };
  
  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "Unknown Salon";

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

      {/* Dialog for Editing Hairdresser */}
      <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => { setIsEditFormOpen(isOpen); if (!isOpen) setEditingHairdresser(null); }}>
        <DialogContent className="sm:max-w-lg font-body">
          <DialogHeader> <DialogTitle className="font-headline text-2xl">Edit Hairdresser Profile</DialogTitle> </DialogHeader>
          {editingHairdresser && ( // Only render form if editingHairdresser is set
            <HairdresserForm
              initialData={editingHairdresser}
              salons={salons} 
              onSubmit={handleUpdateHairdresser}
              isEditing={true}
              isLoading={isLoading}
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
              <CardHeader className="flex flex-row items-center gap-4 bg-secondary/30 p-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={hairdresser.profilePictureUrl} alt={hairdresser.name} data-ai-hint="person portrait" />
                  <AvatarFallback className="bg-primary/30 text-primary font-headline"> {hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase()} </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline text-xl text-foreground">{hairdresser.name}</CardTitle>
                  <CardDescription className="font-body text-primary flex items-center gap-1"> <Store size={14}/> {getSalonName(hairdresser.salonId)} </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 font-body flex-grow p-4">
                 {hairdresser.email && ( <div className="flex items-start text-sm"> <Mail className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Email: </strong> {hairdresser.email} </div> </div> )}
                 {hairdresser.must_reset_password && <p className="text-xs text-destructive">User must reset password on next login.</p>}
                <div className="flex items-start text-sm"> <Sparkles className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Specialties: </strong> {hairdresser.specialties.join(", ")} </div> </div>
                <div className="flex items-start text-sm"> <Clock className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" /> <div> <strong className="text-muted-foreground">Availability: </strong> {hairdresser.availability} </div> </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                {/* Edit button now directly triggers the Dialog for editing */}
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => openEditForm(hairdresser)} className="font-body" disabled={isLoading}> <Edit3 className="mr-2 h-4 w-4" /> Edit </Button>
                </DialogTrigger>
                 <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="font-body" disabled={isLoading}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader> <AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle> <AlertDialogDescription className="font-body"> This action cannot be undone. This will permanently delete the hairdresser "{hairdresser.name}". Real deletion requires a Cloud Function. </AlertDialogDescription> </AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel> <AlertDialogAction onClick={() => handleDeleteHairdresser(hairdresser)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body"> Delete (Simulated) </AlertDialogAction> </AlertDialogFooter>
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
