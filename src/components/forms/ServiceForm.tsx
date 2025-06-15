
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
import { Checkbox } from "@/components/ui/checkbox";
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
  salonIds: z.array(z.string()).nonempty({ message: "Please select at least one salon for this service." }),
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
      salonIds: initialData.salonIds || [],
      isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    } : {
      name: "",
      description: "",
      durationMinutes: 60,
      price: 0,
      salonIds: [],
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
        salonIds: initialData.salonIds || [],
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
       form.reset({
        name: "",
        description: "",
        durationMinutes: 60,
        price: 0,
        salonIds: [],
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
              name="salonIds"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base">Associated Salons</FormLabel>
                    <FormDescription>
                      Select all salons where this service is offered.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {salons.map((salon) => (
                      <FormField
                        key={salon.id}
                        control={form.control}
                        name="salonIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-accent/50 transition-colors"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(salon.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, salon.id])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== salon.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex-1 text-sm">
                                {salon.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  {salons.length === 0 && <FormDescription className="mt-2 text-destructive">No salons available. Please add a salon first to create a service.</FormDescription>}
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
