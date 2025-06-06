"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"; // Renamed to avoid conflict
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Booking, Salon, Hairdresser } from "@/lib/types";
import { CalendarDays, User, StoreIcon, ClockIcon, Filter, Palette } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock Data (same as bookings page for consistency)
const mockSalonsData: Salon[] = [
  { id: "1", name: "SalonVerse Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "SalonVerse Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", salonId: "1", specialties: [], availability: "" },
  { id: "h2", name: "Bob Johnson", salonId: "2", specialties: [], availability: "" },
  { id: "h3", name: "Carol White", salonId: "1", specialties: [], availability: "" },
];

const mockBookingsData: Booking[] = [
  { id: "b1", clientName: "John Doe", salonId: "1", hairdresserId: "h1", service: "Men's Cut", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 45, status: "Confirmed", clientPhone: "0811234567", color: "hsl(var(--chart-1))" },
  { id: "b2", clientName: "Jane Smith", salonId: "2", hairdresserId: "h2", service: "Ladies Cut & Blowdry", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 2)), durationMinutes: 90, status: "Pending", clientPhone: "0821234567", color: "hsl(var(--chart-2))" },
  { id: "b3", clientName: "Mike Brown", salonId: "1", hairdresserId: "h3", service: "Color Correction", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 180, status: "Completed", clientPhone: "0831234567", color: "hsl(var(--chart-3))" },
  { id: "b4", clientName: "Sarah Wilson", salonId: "1", hairdresserId: "h1", service: "Highlights", appointmentDateTime: new Date(), durationMinutes: 120, status: "Confirmed", clientPhone: "0841234567", color: "hsl(var(--chart-4))" },
];


export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>(mockBookingsData);
  const [salons, setSalons] = useState<Salon[]>(mockSalonsData);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>(mockHairdressersData);

  const [filterSalonId, setFilterSalonId] = useState<string>("all");
  const [filterHairdresserId, setFilterHairdresserId] = useState<string>("all");

  const filteredBookings = bookings
    .filter(booking => selectedDate ? isSameDay(new Date(booking.appointmentDateTime), selectedDate) : true)
    .filter(booking => filterSalonId === "all" || booking.salonId === filterSalonId)
    .filter(booking => filterHairdresserId === "all" || booking.hairdresserId === filterHairdresserId)
    .sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
  
  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "N/A";
  const getHairdresserName = (hairdresserId: string) => hairdressers.find(h => h.id === hairdresserId)?.name || "N/A";

  const getStatusBadgeVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Completed': return 'outline';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  
  const availableHairdressersForFilter = filterSalonId === "all" ? hairdressers : hairdressers.filter(h => h.salonId === filterSalonId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Calendar View"
        description="Visualize and manage appointments across locations and hairdressers."
        icon={CalendarDays}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-body">
            <div>
              <label htmlFor="salon-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Salon</label>
              <Select value={filterSalonId} onValueChange={setFilterSalonId}>
                <SelectTrigger id="salon-filter"><SelectValue placeholder="All Salons" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salons</SelectItem>
                  {salons.map(salon => <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="hairdresser-filter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Hairdresser</label>
              <Select value={filterHairdresserId} onValueChange={setFilterHairdresserId} disabled={availableHairdressersForFilter.length === 0 && filterSalonId !== "all"}>
                <SelectTrigger id="hairdresser-filter"><SelectValue placeholder="All Hairdressers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hairdressers</SelectItem>
                  {availableHairdressersForFilter.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
               {availableHairdressersForFilter.length === 0 && filterSalonId !== "all" && <p className="text-xs text-muted-foreground mt-1">No hairdressers in selected salon.</p>}
            </div>
             <div className="pt-2">
              <ShadcnCalendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border shadow-sm bg-card"
                disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-30)) || date > new Date(new Date().setDate(new Date().getDate()+30))} // Example: limit to +/- 30 days
              />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Appointments for: {selectedDate ? format(selectedDate, "PPP") : "All Dates"}
              </CardTitle>
              <CardDescription className="font-body">
                {filteredBookings.length} appointment(s) found with current filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredBookings.length > 0 ? (
                <ul className="space-y-4">
                  {filteredBookings.map(booking => (
                    <li key={booking.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card" style={{ borderLeft: `5px solid ${booking.color || 'hsl(var(--primary))'}` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-headline text-lg text-foreground">{booking.service}</h3>
                          <p className="text-sm text-muted-foreground font-body flex items-center gap-1"><User size={14}/> {booking.clientName} - {booking.clientPhone}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(booking.status)} className="font-body">{booking.status}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm font-body">
                        <p className="flex items-center gap-1"><ClockIcon size={14} className="text-primary"/> {format(new Date(booking.appointmentDateTime), "p")} ({booking.durationMinutes} mins)</p>
                        <p className="flex items-center gap-1"><User size={14} className="text-primary"/> {getHairdresserName(booking.hairdresserId)}</p>
                        <p className="flex items-center gap-1"><StoreIcon size={14} className="text-primary"/> {getSalonName(booking.salonId)}</p>
                      </div>
                       {booking.notes && <p className="mt-2 text-xs text-muted-foreground/80 font-body border-t pt-2"><strong>Notes:</strong> {booking.notes}</p>}
                       <div className="mt-3 text-right">
                          <Button variant="link" size="sm" asChild className="text-primary font-body">
                              <Link href={`/bookings?edit=${booking.id}`}>View/Edit Booking</Link>
                          </Button>
                       </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10">
                  <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-body text-muted-foreground">No appointments scheduled for this day or matching filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
