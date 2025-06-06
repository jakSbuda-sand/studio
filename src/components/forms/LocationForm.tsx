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
import type { Salon } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";

const salonFormSchema = z.object({
  name: z.string().min(2, { message: "Salon name must be at least 2 characters." }),
  address: z.string().min(10, { message: "Address must be at least 10 characters." }),
  phone: z.string().optional(),
  operatingHours: z.string().optional(),
});

type SalonFormValues = z.infer<typeof salonFormSchema>;

interface LocationFormProps {
  initialData?: Salon | null;
  onSubmit: (data: SalonFormValues) => Promise<void>;
}

export function LocationForm({ initialData, onSubmit }: LocationFormProps) {
  const form = useForm<SalonFormValues>({
    resolver: zodResolver(salonFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      phone: "",
      operatingHours: "",
    },
  });

  const handleSubmit = async (data: SalonFormValues) => {
    await onSubmit(data);
    // Optionally reset form or show success message
    // form.reset(); // if it's a create form
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            {initialData ? "Edit Salon Location" : "Add New Salon Location"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 font-body">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salon Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Glamour Spot Midrand" {...field} />
                  </FormControl>
                  <FormDescription>The official name of the salon location.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main Street, Midrand, Gauteng" {...field} />
                  </FormControl>
                  <FormDescription>Full physical address of the salon.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 011 123 4567" {...field} />
                  </FormControl>
                  <FormDescription>Contact phone number for this location.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operatingHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operating Hours (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mon-Fri: 9am-7pm, Sat: 10am-5pm" {...field} />
                  </FormControl>
                  <FormDescription>Business hours for this salon.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {initialData ? "Save Changes" : "Add Location"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
