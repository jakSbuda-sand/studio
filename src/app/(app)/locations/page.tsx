
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocationForm } from "@/components/forms/LocationForm";
import type { Salon, LocationDoc } from "@/lib/types"; // LocationDoc for Firestore data
import { Store, PlusCircle, Edit3, Trash2, Phone, Clock, ShieldAlert, Loader2 } from "lucide-react";
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
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";

export default function LocationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial data loading
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions

  useEffect(() => {
    if (user && user.role !== 'admin') {
      // router.replace('/dashboard');
      // No need to fetch data if not admin
      setIsLoading(false);
      return;
    }

    const fetchSalons = async () => {
      setIsLoading(true);
      try {
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const locationsList = locationSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as LocationDoc)
        } as Salon)); // Cast to Salon, ensuring Timestamps are handled if needed by UI
        setSalons(locationsList.sort((a,b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching salons: ", error);
        toast({ title: "Error Fetching Salons", description: "Could not load salon locations from the database.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchSalons();
    }
  }, [user]);


  if (!user) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading user...</span></div>;

  if (user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
            <CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              You do not have permission to manage salon locations.
            </CardDescription>
          </CardContent>
           <CardFooter className="justify-center">
             <Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Go to Dashboard
              </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleAddSalon = async (data: Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      const docData: LocationDoc = {
        ...data,
        createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
        updatedAt: serverTimestamp() as Timestamp,
      };
      const docRef = await addDoc(collection(db, "locations"), docData);
      setSalons(prev => [...prev, { ...data, id: docRef.id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }].sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Salon Added", description: `${data.name} has been successfully added.` });
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error adding salon: ", error);
      toast({ title: "Error Adding Salon", description: "Could not add salon to the database.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSalon = async (data: Partial<Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!editingSalon) return;
    setIsSubmitting(true);
    try {
      const salonRef = doc(db, "locations", editingSalon.id);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(salonRef, updateData);
      
      setSalons(prev => prev.map(s => s.id === editingSalon.id ? { ...s, ...data, updatedAt: Timestamp.now() } as Salon : s).sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Salon Updated", description: `${data.name || editingSalon.name} has been successfully updated.` });
      setIsFormOpen(false);
      setEditingSalon(null);
    } catch (error) {
      console.error("Error updating salon: ", error);
      toast({ title: "Error Updating Salon", description: "Could not update salon in the database.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSalon = async (id: string, name: string) => {
    setIsSubmitting(true); // Use isSubmitting to disable buttons during delete
    try {
      await deleteDoc(doc(db, "locations", id));
      setSalons(prev => prev.filter(s => s.id !== id));
      toast({ title: "Salon Deleted", description: `Salon "${name}" has been successfully deleted.`, variant: "destructive" });
    } catch (error) {
      console.error("Error deleting salon: ", error);
      toast({ title: "Error Deleting Salon", description: "Could not delete salon from the database.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditForm = (salon: Salon) => {
    setEditingSalon(salon);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Salon Locations"
        description="Manage all your salon branches from one place."
        icon={Store}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingSalon(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg font-body max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingSalon ? "Edit Salon Location" : "Add New Salon Location"}
                </DialogTitle>
              </DialogHeader>
              <LocationForm
                initialData={editingSalon}
                onSubmit={editingSalon ? (data) => handleUpdateSalon(data as Partial<Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>>) : (data) => handleAddSalon(data as Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>)}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" /> <span className="ml-3 text-lg font-body">Loading Salons...</span>
        </div>
      ) : salons.length === 0 ? (
         <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader>
            <Store className="mx-auto h-16 w-16 text-muted-foreground" />
            <CardTitle className="mt-4 text-2xl font-headline">No Salon Locations Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              Start by adding your first salon location to manage its details and staff.
            </CardDescription>
          </CardContent>
          <CardFooter className="justify-center">
             <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add First Location
              </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <Card key={salon.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col rounded-lg overflow-hidden">
              <CardHeader className="bg-secondary/30">
                <CardTitle className="font-headline text-xl text-foreground">{salon.name}</CardTitle>
                <CardDescription className="font-body text-muted-foreground">{salon.address}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 font-body flex-grow">
                {salon.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="mr-2 h-4 w-4 text-primary" />
                    <span>{salon.phone}</span>
                  </div>
                )}
                {salon.operatingHours && (
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2 h-4 w-4 text-primary" />
                    <span>{salon.operatingHours}</span>
                  </div>
                )}
                 {salon.createdAt && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Added: {(salon.createdAt as Timestamp).toDate().toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                <Button variant="outline" size="sm" onClick={() => openEditForm(salon)} className="font-body" disabled={isSubmitting}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="font-body" disabled={isSubmitting}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription className="font-body">
                        This action cannot be undone. This will permanently delete the salon location "{salon.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-body" disabled={isSubmitting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteSalon(salon.id, salon.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete"}
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
