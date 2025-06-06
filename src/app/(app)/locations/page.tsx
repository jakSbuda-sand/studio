
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocationForm } from "@/components/forms/LocationForm";
import type { Salon } from "@/lib/types";
import { Store, PlusCircle, Edit3, Trash2, Phone, Clock, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

// Mock server action (replace with actual API calls)
async function addSalonAction(data: Omit<Salon, 'id'>): Promise<Salon> {
  console.log("Adding salon:", data);
  await new Promise(resolve => setTimeout(resolve, 500));
  const newSalon = { ...data, id: Math.random().toString(36).substr(2, 9) };
  toast({ title: "Salon Added", description: `${data.name} has been successfully added.` });
  return newSalon;
}

async function updateSalonAction(id: string, data: Partial<Salon>): Promise<Salon> {
  console.log("Updating salon:", id, data);
  await new Promise(resolve => setTimeout(resolve, 500));
  toast({ title: "Salon Updated", description: `${data.name || 'Salon'} has been successfully updated.` });
  return { ...mockSalons.find(s => s.id === id)!, ...data } as Salon;
}

async function deleteSalonAction(id: string): Promise<void> {
  console.log("Deleting salon:", id);
  await new Promise(resolve => setTimeout(resolve, 500));
  toast({ title: "Salon Deleted", description: `Salon has been successfully deleted.`, variant: "destructive" });
}


const mockSalons: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand", phone: "011 555 1234", operatingHours: "Mon-Fri: 9am-6pm, Sat: 9am-4pm" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg", phone: "011 555 5678", operatingHours: "Tue-Sat: 8am-7pm, Sun: 10am-3pm" },
];

export default function LocationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>(mockSalons);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      // Redirect or show access denied for non-admins
      // For this pass, we'll just show an access denied message within the page content.
      // router.replace('/dashboard'); 
      // toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
    }
  }, [user, router]);


  if (!user) return <p>Loading...</p>;

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


  const handleAddSalon = async (data: Omit<Salon, 'id'>) => {
    const newSalon = await addSalonAction(data);
    setSalons(prev => [...prev, newSalon]);
    setIsFormOpen(false);
  };

  const handleUpdateSalon = async (data: Partial<Salon>) => {
    if (!editingSalon) return;
    const updatedSalon = await updateSalonAction(editingSalon.id, data);
    setSalons(prev => prev.map(s => s.id === editingSalon.id ? updatedSalon : s));
    setIsFormOpen(false);
    setEditingSalon(null);
  };

  const handleDeleteSalon = async (id: string) => {
    await deleteSalonAction(id);
    setSalons(prev => prev.filter(s => s.id !== id));
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
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg font-body">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingSalon ? "Edit Salon Location" : "Add New Salon Location"}
                </DialogTitle>
              </DialogHeader>
              <LocationForm
                initialData={editingSalon}
                onSubmit={editingSalon ? handleUpdateSalon : handleAddSalon}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {salons.length === 0 ? (
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
             <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                <Button variant="outline" size="sm" onClick={() => openEditForm(salon)} className="font-body">
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="font-body">
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
                      <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteSalon(salon.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body">
                        Delete
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
