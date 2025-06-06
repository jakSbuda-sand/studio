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
import type { Hairdresser, Salon } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const hairdresserFormSchema = z.object({
  name: z.string().min(2, { message: "Hairdresser name must be at least 2 characters." }),
  salonId: z.string({ required_error: "Please select a salon." }),
  specialties: z.string().min(3, {message: "Enter at least one specialty."}), // Storing as comma-separated string for simplicity
  availability: z.string().min(5, {message: "Please describe availability."}), // Simplified availability
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

export type HairdresserFormValues = z.infer<typeof hairdresserFormSchema>;

interface HairdresserFormProps {
  initialData?: Hairdresser | null;
  salons: Salon[]; // To populate salon selection
  onSubmit: (data: HairdresserFormValues) => Promise<void>;
}

export function HairdresserForm({ initialData, salons, onSubmit }: HairdresserFormProps) {
  const form = useForm<HairdresserFormValues>({
    resolver: zodResolver(hairdresserFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      specialties: initialData.specialties.join(", "), // Convert array to string
    } : {
      name: "",
      salonId: "",
      specialties: "",
      availability: "",
      profilePictureUrl: "",
    },
  });

  const handleSubmit = async (data: HairdresserFormValues) => {
    await onSubmit(data);
  };

  return (
    <Card className="shadow-lg rounded-lg">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {initialData ? "Edit Hairdresser Profile" : "Add New Hairdresser"}
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
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Alice Wonderland" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="salonId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Assigned Salon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a salon location" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {salons.map(salon => (
                            <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>Which salon will this hairdresser primarily work at?</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Haircuts, Coloring, Balayage" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of services they specialize in.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Availability</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm. Off on Sundays." {...field} />
                    </FormControl>
                    <FormDescription>Describe their general working hours and days.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="profilePictureUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Profile Picture URL (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="https://example.com/image.png" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                {initialData ? "Save Changes" : "Add Hairdresser"}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
