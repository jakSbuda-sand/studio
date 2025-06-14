
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Salon, Service } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import React from "react";

const serviceFormSchema = z.object({
  name: z.string().min(2, { message: "Service name must be at least 2 characters." }),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive({ message: "Duration must be a positive number of minutes." }),
  price: z.coerce.number().min(0, { message: "Price cannot be negative." }),
  salonId: z.string({ required_error: "Please select a salon for this service." }),
  isActive: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: Service | null;
  salons: Salon[];
  onSubmit: (data: ServiceFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ServiceForm({ initialData, salons, onSubmit, isSubmitting = false }: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || "",
      durationMinutes: initialData.durationMinutes,
      price: initialData.price,
      salonId: initialData.salonId,
      isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    } : {
      name: "",
      description: "",
      durationMinutes: 60,
      price: 0,
      salonId: "",
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        durationMinutes: initialData.durationMinutes,
        price: initialData.price,
        salonId: initialData.salonId,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
       form.reset({
        name: "",
        description: "",
        durationMinutes: 60,
        price: 0,
        salonId: salons.length > 0 ? salons[0].id : "", // Default to first salon if available
        isActive: true,
      });
    }
  }, [initialData, form, salons]);


  const handleSubmit = async (data: ServiceFormValues) => {
    await onSubmit(data);
  };

  return (
    <Card className="shadow-none border-0">
      <CardContent className="pt-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 font-body">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Ladies Cut & Blowdry" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData || salons.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the salon offering this service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salons.map((salon) => (
                        <SelectItem key={salon.id} value={salon.id}>
                          {salon.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!!initialData && <FormDescription>Salon cannot be changed after service creation. Create a new service for a different salon.</FormDescription>}
                  {salons.length === 0 && <FormDescription>No salons available. Please add a salon first.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (R)</FormLabel>
                    <FormControl><Input type="number" placeholder="300" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Describe the service..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Is this service currently offered?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || salons.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save Changes" : "Add Service")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
