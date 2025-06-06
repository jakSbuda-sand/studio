
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Booking, Salon, Hairdresser, User } from "@/lib/types";
import { CalendarDays, User as UserIcon, StoreIcon, ClockIcon, Filter } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const mockSalonsData: Salon[] = [
  { id: "1", name: "LaPresh Beauty Salon Midrand", address: "123 Oracle Avenue, Waterfall City, Midrand" },
  { id: "2", name: "LaPresh Beauty Salon Randburg", address: "456 Republic Road, Randburg Central, Randburg" },
];

const mockHairdressersData: Hairdresser[] = [
  { id: "h1", name: "Alice Smith", userId: "uid1", email: "alice@example.com", assigned_locations: ["1"], specialties: [], availability: "", working_days: [] },
  { id: "h2", name: "Bob Johnson", userId: "uid2", email: "bob@example.com", assigned_locations: ["2", "1"], specialties: [], availability: "", working_days: [] },
  { id: "h3", name: "Carol White", userId: "uid3", email: "carol@example.com", assigned_locations: ["1"], specialties: [], availability: "", working_days: [] },
];

let globalMockBookingsDataForCalendar: Booking[] = [
  { id: "b1", clientName: "John Doe", salonId: "1", hairdresserId: "h1", service: "Men's Cut", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 45, status: "Confirmed", clientPhone: "0811234567", color: "hsl(var(--chart-1))" },
  { id: "b2", clientName: "Jane Smith", salonId: "2", hairdresserId: "h2", service: "Ladies Cut & Blowdry", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 2)), durationMinutes: 90, status: "Pending", clientPhone: "0821234567", color: "hsl(var(--chart-2))" },
  { id: "b3", clientName: "Mike Brown", salonId: "1", hairdresserId: "h3", service: "Color Correction", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 180, status: "Completed", clientPhone: "0831234567", color: "hsl(var(--chart-3))" },
  { id: "b4", clientName: "Sarah Wilson", salonId: "1", hairdresserId: "h1", service: "Highlights", appointmentDateTime: new Date(), durationMinutes: 120, status: "Confirmed", clientPhone: "0841234567", color: "hsl(var(--chart-4))" },
  { id: "b5", clientName: "Chris Green", salonId: "1", hairdresserId: "h2", service: "Beard Trim", appointmentDateTime: new Date(new Date().setDate(new Date().getDate() + 1)), durationMinutes: 30, status: "Confirmed", clientPhone: "0851234567", color: "hsl(var(--chart-5))" },
];


export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings] = useState<Booking[]>(globalMockBookingsDataForCalendar);
  const [salons] = useState<Salon[]>(mockSalonsData);
  const [hairdressers] = useState<Hairdresser[]>(mockHairdressersData);

  const [filterSalonId, setFilterSalonId] = useState<string>("all");
  const [filterHairdresserId, setFilterHairdresserId] = useState<string>("all");

  useEffect(() => {
    if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
      setFilterHairdresserId(user.hairdresserProfileId);
      const hairdresserDetails = mockHairdressersData.find(h => h.id === user.hairdresserProfileId);
      if (hairdresserDetails && hairdresserDetails.assigned_locations.length > 0) {
        // If hairdresser is assigned to multiple, admin might pick.
        // For now, pre-filter by their first assigned salon if they are a hairdresser.
        setFilterSalonId(hairdresserDetails.assigned_locations[0]);
      }
    }
  }, [user]);

  const filteredBookings = bookings
    .filter(booking => selectedDate ? isSameDay(new Date(booking.appointmentDateTime), selectedDate) : true)
    .filter(booking => filterSalonId === "all" || booking.salonId === filterSalonId) // Filter by salon where booking occurs
    .filter(booking => {
      if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
        return booking.hairdresserId === user.hairdresserProfileId;
      }
      return filterHairdresserId === "all" || booking.hairdresserId === filterHairdresserId;
    })
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
  
  // Hairdressers available for filter dropdown, based on selected salon (if any)
  const availableHairdressersForFilter = filterSalonId === "all" 
    ? hairdressers 
    : hairdressers.filter(h => h.assigned_locations.includes(filterSalonId));
  
  if (!user) return <p>Loading...</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.role === 'admin' ? "Admin Calendar View" : "My Calendar"}
        description="Visualize and manage appointments."
        icon={CalendarDays}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-body">
            {user.role === 'admin' && (
              <>
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
                  <Select 
                    value={filterHairdresserId} 
                    onValueChange={setFilterHairdresserId} 
                    disabled={user.role === 'hairdresser' || (filterSalonId !== "all" && availableHairdressersForFilter.length === 0)}
                  >
                    <SelectTrigger id="hairdresser-filter"><SelectValue placeholder="All Hairdressers" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hairdressers</SelectItem>
                      {availableHairdressersForFilter.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {filterSalonId !== "all" && availableHairdressersForFilter.length === 0 && <p className="text-xs text-muted-foreground mt-1">No hairdressers assigned to selected salon.</p>}
                </div>
              </>
            )}
             <div className="pt-2">
              <ShadcnCalendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border shadow-sm bg-card"
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
                {filteredBookings.length} appointment(s) found.
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
                          <p className="text-sm text-muted-foreground font-body flex items-center gap-1"><UserIcon size={14}/> {booking.clientName} - {booking.clientPhone}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(booking.status)} className="font-body">{booking.status}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm font-body">
                        <p className="flex items-center gap-1"><ClockIcon size={14} className="text-primary"/> {format(new Date(booking.appointmentDateTime), "p")} ({booking.durationMinutes} mins)</p>
                        {(user.role === 'admin' || booking.hairdresserId !== user.hairdresserProfileId) && <p className="flex items-center gap-1"><UserIcon size={14} className="text-primary"/> {getHairdresserName(booking.hairdresserId)}</p>}
                        <p className="flex items-center gap-1"><StoreIcon size={14} className="text-primary"/> {getSalonName(booking.salonId)}</p>
                      </div>
                       {booking.notes && <p className="mt-2 text-xs text-muted-foreground/80 font-body border-t pt-2"><strong>Notes:</strong> {booking.notes}</p>}
                       <div className="mt-3 text-right">
                          <Button variant="link" size="sm" asChild className="text-primary font-body">
                              <Link href={user.role === 'hairdresser' ? `/bookings?view=mine&edit=${booking.id}` : `/bookings?edit=${booking.id}`}>View/Edit Booking</Link>
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
