
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Booking, Salon, Hairdresser, User, LocationDoc, HairdresserDoc, BookingDoc } from "@/lib/types";
import { CalendarDays, User as UserIcon, StoreIcon, ClockIcon, Filter, Loader2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

const getStatusColor = (status: Booking['status']): string => {
  switch (status) {
    case 'Completed':
      return 'hsl(130, 60%, 50%)'; // Green
    case 'Confirmed':
      return 'hsl(var(--primary))'; // Primary theme color (lavender)
    case 'Pending':
      return 'hsl(38, 92%, 50%)'; // Orange/Yellow
    case 'Cancelled':
      return 'hsl(0, 0%, 60%)'; // Gray
    default:
      return 'hsl(var(--muted-foreground))';
  }
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [hairdressers, setHairdressers] = useState<Hairdresser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterSalonId, setFilterSalonId] = useState<string>("all");
  const [filterHairdresserId, setFilterHairdresserId] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Salons
        const locationsCol = collection(db, "locations");
        const locationSnapshot = await getDocs(locationsCol);
        const salonsList = locationSnapshot.docs.map(sDoc => ({
          id: sDoc.id,
          ...(sDoc.data() as LocationDoc)
        } as Salon));
        setSalons(salonsList);

        // Fetch Hairdressers
        const hairdressersCol = collection(db, "hairdressers");
        const hairdresserSnapshot = await getDocs(hairdressersCol);
        const hairdressersList = hairdresserSnapshot.docs.map(hDoc => {
          const data = hDoc.data() as HairdresserDoc;
          return {
            id: hDoc.id,
            userId: data.user_id,
            name: data.name,
            email: data.email,
            assigned_locations: data.assigned_locations || [],
            specialties: data.specialties || [],
            availability: data.availability || "",
            working_days: data.working_days || [],
            profilePictureUrl: data.profilePictureUrl || "",
            must_reset_password: data.must_reset_password || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Hairdresser;
        });
        setHairdressers(hairdressersList);

        // Fetch Bookings
        let bookingsQueryBuilder = query(collection(db, "bookings"), orderBy("appointmentDateTime", "asc"));
        // If hairdresser, only fetch their bookings by default
        if (user.role === 'hairdresser' && user.hairdresserProfileId) {
          bookingsQueryBuilder = query(collection(db, "bookings"), where("hairdresserId", "==", user.hairdresserProfileId), orderBy("appointmentDateTime", "asc"));
          setFilterHairdresserId(user.hairdresserProfileId); // Pre-select their filter
          const hairdresserDetails = hairdressersList.find(h => h.id === user.hairdresserProfileId);
          if (hairdresserDetails && hairdresserDetails.assigned_locations.length > 0) {
            setFilterSalonId(hairdresserDetails.assigned_locations[0]);
          }
        }

        const bookingSnapshot = await getDocs(bookingsQueryBuilder);
        const bookingsList = bookingSnapshot.docs.map(bDoc => {
          const data = bDoc.data() as BookingDoc;
          let appointmentDateTimeJS: Date;
          if (data.appointmentDateTime instanceof Timestamp) {
            appointmentDateTimeJS = data.appointmentDateTime.toDate();
          } else if (typeof data.appointmentDateTime === 'string') {
            appointmentDateTimeJS = new Date(data.appointmentDateTime);
          } else {
            appointmentDateTimeJS = data.appointmentDateTime; 
          }
          return {
            id: bDoc.id,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            salonId: data.salonId,
            hairdresserId: data.hairdresserId,
            service: data.service,
            appointmentDateTime: appointmentDateTimeJS,
            durationMinutes: data.durationMinutes,
            status: data.status,
            notes: data.notes,
            color: getStatusColor(data.status), // Assign color based on status
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Booking;
        });
        setBookings(bookingsList);

      } catch (error: any) {
        console.error("Error fetching calendar data:", error);
        toast({ title: "Error Fetching Data", description: `Could not load calendar data: ${error.message}.`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);
  
  const filteredBookings = bookings
    .filter(booking => selectedDate ? isSameDay(booking.appointmentDateTime, selectedDate) : true)
    .filter(booking => filterSalonId === "all" || booking.salonId === filterSalonId)
    .filter(booking => {
      if (user?.role === 'hairdresser' && user.hairdresserProfileId) {
        return booking.hairdresserId === user.hairdresserProfileId;
      }
      return filterHairdresserId === "all" || booking.hairdresserId === filterHairdresserId;
    })
    .sort((a,b) => a.appointmentDateTime.getTime() - b.appointmentDateTime.getTime());
  
  const getSalonName = (salonId: string) => salons.find(s => s.id === salonId)?.name || "N/A";
  const getHairdresserName = (hairdresserId: string) => hairdressers.find(h => h.id === hairdresserId)?.name || "N/A";

  const getStatusBadgeVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Completed': return 'outline'; // Greenish outline
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  
  const availableHairdressersForFilter = filterSalonId === "all" 
    ? hairdressers 
    : hairdressers.filter(h => h.assigned_locations.includes(filterSalonId));
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading calendar...</span>
      </div>
    );
  }

  if (!user) return <p className="text-center mt-10 font-body">Please log in to view the calendar.</p>;

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
                  <Select value={filterSalonId} onValueChange={(value) => {
                    setFilterSalonId(value);
                    // If a salon is selected, and current hairdresser filter is for a hairdresser NOT in this salon, reset hairdresser filter.
                    if (value !== "all" && filterHairdresserId !== "all") {
                      const selectedHairdresser = hairdressers.find(h => h.id === filterHairdresserId);
                      if (selectedHairdresser && !selectedHairdresser.assigned_locations.includes(value)) {
                        setFilterHairdresserId("all");
                      }
                    }
                  }}>
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
                    disabled={filterSalonId !== "all" && availableHairdressersForFilter.length === 0}
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
                        <p className="flex items-center gap-1"><ClockIcon size={14} className="text-primary"/> {format(booking.appointmentDateTime, "p")} ({booking.durationMinutes} mins)</p>
                        {(user.role === 'admin' || (user.role === 'hairdresser' && booking.hairdresserId !== user.hairdresserProfileId)) && 
                          (user.role === 'admin' && <p className="flex items-center gap-1"><UserIcon size={14} className="text-primary"/> {getHairdresserName(booking.hairdresserId)}</p>)
                        }
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

    