"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HairdresserForm, type HairdresserFormValues } from "@/components/forms/HairdresserForm";
import type { Hairdresser, Salon } from "@/lib/types";
import { Users, PlusCircle, Edit3, Trash2, Store, Sparkles, Clock } from "lucide-react";
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

// Mock server actions (replace with actual API calls)
async function addHairdresserAction(data: HairdresserFormValues): Promise<Hairdresser> {
  console.log("Adding hairdresser:", data);
  await new Promise(resolve => setTimeout(resolve, 500));
  const newHairdresser: Hairdresser = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    specialties: data.specialties.split(",").map(s => s.trim()),
  };
  toast({ title: "Hairdresser Added", description: `${data.name} has been successfully added.` });
  return newHairdresser;
}

async function updateHairdresserAction(id: string, data: HairdresserFormValues): Promise<Hairdresser> {
  console.log("Updating hairdresser:", id, data);
  await new Promise(resolve => setTimeout(resolve, 500));
  const updatedHairdresser: Hairdresser = {
    ...mockHairdressers.find(h => h.id === id)!,
    ...data,
    specialties: data.specialties.split(",").map(s => s.trim()),
  };
  toast({ title: "Hairdresser Updated", description: `${data.name} has been successfully updated.` });
  return updatedHairdresser;
}

async function deleteHairdresserAction(id: string): Promise<void> {
  console.log("Deleting hairdresser:", id);
  await new Promise(resolve => setTimeout(resolve, 500));
  toast({ title: "Hairdresser Deleted", description: `Hairdresser has been successfully deleted.`, variant: "destructive" });
}

const mockSalonsData: Salon[] = [
  { id: "1", name: "SalonVerse Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand", phone: "011 555 1234", operatingHours: "Mon-Fri: 9am-6pm, Sat: 9am-4pm" },
  { id: "2", name: "SalonVerse Randburg", address: "456 Republic Road, Randburg Central, Randburg", phone: "011 555 5678", operatingHours: "Tue-Sat: 8am-7pm, Sun: 10am-3pm" },
];

const mockHairdressers: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", salonId: "1", specialties: ["Cutting", "Coloring"], availability: "Mon-Fri 9am-5pm", profilePictureUrl: "https://placehold.co/100x100.png?text=AS" },
  { id: "h2", name: "Bob Johnson", salonId: "2", specialties: ["Styling", "Men's Cuts"], availability: "Tue-Sat 10am-6pm", profilePictureUrl: "https://placehold.co/100x100.png?text=BJ" },
  { id: "h3", name: "Carol White", salonId: "1", specialties: ["Extensions", "Bridal Hair"], availability: "Wed-Sun 11am-7pm" },
];


export default function HairdressersPage() {
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>(mockHairdressers);
  const [salons, setSalons] = useState<Salon[]>(mockSalonsData); // Fetch or pass salons data
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHairdresser, setEditingHairdresser] = useState<Hairdresser | null>(null);

  // In a real app, fetch salons from an API
  useEffect(() => {
    // setSalons(fetchedSalons);
  }, []);

  const handleAddHairdresser = async (data: HairdresserFormValues) => {
    const newHairdresser = await addHairdresserAction(data);
    setHairdressers(prev => [...prev, newHairdresser]);
    setIsFormOpen(false);
  };

  const handleUpdateHairdresser = async (data: HairdresserFormValues) => {
    if (!editingHairdresser) return;
    const updatedHairdresser = await updateHairdresserAction(editingHairdresser.id, data);
    setHairdressers(prev => prev.map(h => h.id === editingHairdresser.id ? updatedHairdresser : h));
    setIsFormOpen(false);
    setEditingHairdresser(null);
  };

  const handleDeleteHairdresser = async (id: string) => {
    await deleteHairdresserAction(id);
    setHairdressers(prev => prev.filter(h => h.id !== id));
  };

  const openEditForm = (hairdresser: Hairdresser) => {
    setEditingHairdresser(hairdresser);
    setIsFormOpen(true);
  };
  
  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "Unknown Salon";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hairdresser Management"
        description="Manage your talented team of hairdressers."
        icon={Users}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingHairdresser(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Hairdresser
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg font-body">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingHairdresser ? "Edit Hairdresser Profile" : "Add New Hairdresser"}
                </DialogTitle>
              </DialogHeader>
              <HairdresserForm
                initialData={editingHairdresser}
                salons={salons}
                onSubmit={editingHairdresser ? handleUpdateHairdresser : handleAddHairdresser}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {hairdressers.length === 0 ? (
        <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader>
            <Users className="mx-auto h-16 w-16 text-muted-foreground" />
            <CardTitle className="mt-4 text-2xl font-headline">No Hairdressers Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              Add your first hairdresser to assign them to salons and manage their schedules.
            </CardDescription>
          </CardContent>
           <CardFooter className="justify-center">
             <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add First Hairdresser
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
                  <AvatarFallback className="bg-primary/30 text-primary font-headline">
                    {hairdresser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline text-xl text-foreground">{hairdresser.name}</CardTitle>
                  <CardDescription className="font-body text-primary flex items-center gap-1">
                    <Store size={14}/> {getSalonName(hairdresser.salonId)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 font-body flex-grow p-4">
                <div className="flex items-start text-sm">
                  <Sparkles className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-muted-foreground">Specialties: </strong>
                    {hairdresser.specialties.join(", ")}
                  </div>
                </div>
                <div className="flex items-start text-sm">
                  <Clock className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-muted-foreground">Availability: </strong>
                    {hairdresser.availability}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20 p-4">
                <Button variant="outline" size="sm" onClick={() => openEditForm(hairdresser)} className="font-body">
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
                        This action cannot be undone. This will permanently delete the hairdresser "{hairdresser.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteHairdresser(hairdresser.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body">
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
