
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ServiceForm, type ServiceFormValues } from "@/components/forms/ServiceForm";
import type { Service, Salon, LocationDoc, ServiceDoc, User } from "@/lib/types";
import { Scissors, PlusCircle, Edit3, Trash2, Loader2, PackageOpen, ShieldAlert } from "lucide-react";
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
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, orderBy as firestoreOrderBy } from "@/lib/firebase";

export default function ServicesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { 
        setIsLoading(true);
        return;
    }
    if (user.role !== 'admin') {
      setIsLoading(false); 
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const salonsCol = collection(db, "locations");
        const salonSnapshot = await getDocs(salonsCol);
        const salonsList = salonSnapshot.docs.map(sDoc => ({
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        setSalons(salonsList);

        const servicesCol = collection(db, "services");
        const servicesQuery = query(servicesCol, firestoreOrderBy("name", "asc"));
        const serviceSnapshot = await getDocs(servicesQuery);
        const servicesList = serviceSnapshot.docs.map(sDoc => ({
          id: sDoc.id,
          ...(sDoc.data() as ServiceDoc)
        } as Service));
        setServices(servicesList);

      } catch (error: any) {
        console.error("Error fetching services or salons: ", error);
        toast({ title: "Error Fetching Data", description: `Could not load data: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user && !isLoading) { 
    router.replace('/login');
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-body">Loading services...</span>
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive" /><CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">You do not have permission to manage services.</CardDescription></CardContent>
          <CardFooter className="justify-center"><Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground">Go to Dashboard</Button></CardFooter>
        </Card>
      </div>
    );
  }

  const handleAddService = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const docData: Omit<ServiceDoc, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        price: data.price,
        salonIds: data.salonIds,
        isActive: data.isActive,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      const docRef = await addDoc(collection(db, "services"), docData);
      setServices(prev => [...prev, { ...data, id: docRef.id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }].sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Service Added", description: `${data.name} has been successfully added.` });
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error adding service: ", error);
      toast({ title: "Error Adding Service", description: `Could not add service: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (data: ServiceFormValues) => {
    if (!editingService) return;
    setIsSubmitting(true);
    try {
      const serviceRef = doc(db, "services", editingService.id);
      const updateData: Partial<Omit<ServiceDoc, 'createdAt'>> & {updatedAt: Timestamp} = { 
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        price: data.price,
        salonIds: data.salonIds,
        isActive: data.isActive,
        updatedAt: serverTimestamp() as Timestamp,
      };
      await updateDoc(serviceRef, updateData as any); 
      
      setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...data, salonIds: data.salonIds, updatedAt: Timestamp.now() } : s).sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Service Updated", description: `${data.name} has been successfully updated.` });
      setIsFormOpen(false);
      setEditingService(null);
    } catch (error: any) {
      console.error("Error updating service: ", error);
      toast({ title: "Error Updating Service", description: `Could not update service: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "services", serviceId));
      setServices(prev => prev.filter(s => s.id !== serviceId));
      toast({ title: "Service Deleted", description: `Service "${serviceName}" has been deleted.`, variant: "default" });
    } catch (error: any) {
      console.error("Error deleting service: ", error);
      toast({ title: "Error Deleting Service", description: `Could not delete service: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const getSalonNames = (salonIds: string[]) => {
    if (!salonIds || salonIds.length === 0) return <Badge variant="outline" className="font-body">No Salons</Badge>;
    return salonIds.map(id => {
        const salon = salons.find(s => s.id === id);
        return salon ? <Badge key={id} variant="secondary" className="mr-1 mb-1 font-body">{salon.name}</Badge> : null;
    }).filter(Boolean);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage Services"
        description="Define and manage the services offered at your salons."
        icon={Scissors}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingService(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg font-body">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingService ? "Edit Service" : "Add New Service"}
                </DialogTitle>
              </DialogHeader>
              <ServiceForm
                initialData={editingService}
                salons={salons}
                onSubmit={editingService ? handleUpdateService : handleAddService}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {services.length === 0 ? (
         <Card className="text-center py-12 shadow-lg rounded-lg">
          <CardHeader><PackageOpen className="mx-auto h-16 w-16 text-muted-foreground" /><CardTitle className="mt-4 text-2xl font-headline">No Services Defined</CardTitle></CardHeader>
          <CardContent><CardDescription className="font-body text-lg">Add services to make them available for bookings.</CardDescription></CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add First Service
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-lg rounded-lg">
          <CardHeader><CardTitle className="font-headline">Available Services</CardTitle><CardDescription className="font-body">A list of all services offered across your salons.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline">Service Name</TableHead>
                  <TableHead className="font-headline">Salons</TableHead>
                  <TableHead className="font-headline text-right">Duration (min)</TableHead>
                  <TableHead className="font-headline text-right">Price (R)</TableHead>
                  <TableHead className="font-headline text-center">Status</TableHead>
                  <TableHead className="text-right font-headline">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} className="font-body">
                    <TableCell>
                      <div className="font-medium text-foreground">{service.name}</div>
                      {service.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{service.description}</div>}
                    </TableCell>
                    <TableCell><div className="flex flex-wrap">{getSalonNames(service.salonIds)}</div></TableCell>
                    <TableCell className="text-right">{service.durationMinutes}</TableCell>
                    <TableCell className="text-right">{service.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={service.isActive ? "default" : "outline"} className={service.isActive ? "bg-green-500/20 text-green-700 border-green-500/30" : "bg-red-500/10 text-red-700 border-red-500/20"}>
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(service)} className="hover:text-primary" disabled={isSubmitting}>
                        <Edit3 className="h-4 w-4" /> <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" disabled={isSubmitting}><Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle className="font-headline">Are you sure?</AlertDialogTitle><AlertDialogDescription className="font-body">This will permanently delete the service "{service.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="font-body" disabled={isSubmitting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteService(service.id, service.name)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-body" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete Service"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

