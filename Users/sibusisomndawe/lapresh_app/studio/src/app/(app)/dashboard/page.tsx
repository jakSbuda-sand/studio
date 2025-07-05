
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart as BarChartIcon, DollarSign, Users, CalendarCheck, ClipboardList, Filter, PlusCircle, Store, UserCog, TrendingUp, Loader2, Crown, Scissors, Award, CalendarDays, ListChecks, ArrowRight, CheckCircle, Droplets } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Booking, Service, Hairdresser, HairdresserDoc, ServiceDoc, BookingDoc, ClientDoc, Salon, LocationDoc } from "@/lib/types";
import { db, collection, getDocs, query, where, orderBy, Timestamp, type Query } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, isSameDay } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: string | number, icon: React.ElementType, description?: string, isLoading: boolean }) => {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <div className="text-3xl font-bold font-headline text-foreground">{value}</div>
            {description && <p className="text-xs text-muted-foreground font-body pt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  uniqueClients: number;
  chartData: any[];
  popularServices: { name: string; count: number }[];
  topHairdressers: { name: string; count: number }[];
  upcomingBookings?: number;
  todaysSchedule?: Booking[];
}

type DateRangeFilter = "today" | "7d" | "30d";

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [filterSalonId, setFilterSalonId] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState({ hasSalons: true, hasHairdressers: true, hasServices: true });


  useEffect(() => {
    if (!user) { 
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        let startDate: Date;
        switch (dateRangeFilter) {
            case "today":
                startDate = startOfDay(today);
                break;
            case "30d":
                startDate = startOfDay(subDays(today, 29));
                break;
            case "7d":
            default:
                startDate = startOfDay(subDays(today, 6));
                break;
        }
        const endDate = endOfDay(today);

        const servicesQuery = query(collection(db, "services"));
        const locationsQuery = query(collection(db, "locations"), orderBy("name"));
        const hairdressersQuery = query(collection(db, "hairdressers"));
        
        let bookingsQuery: Query;
        
        if (user.role === 'admin') {
            bookingsQuery = query(
                collection(db, "bookings"),
                where("appointmentDateTime", ">=", Timestamp.fromDate(startDate)),
                where("appointmentDateTime", "<=", Timestamp.fromDate(endDate)),
                orderBy("appointmentDateTime", "asc")
            );
        } else if (user.role === 'hairdresser' && user.hairdresserProfileId) {
           bookingsQuery = query(collection(db, "bookings"), where("hairdresserId", "==", user.hairdresserProfileId), orderBy("appointmentDateTime", "asc"));
        } else {
            setStats({ totalBookings: 0, totalRevenue: 0, uniqueClients: 0, chartData: [], popularServices: [], topHairdressers: [] });
            setIsLoading(false);
            return;
        }

        const [bookingSnapshot, serviceSnapshot, locationSnapshot, hairdresserSnapshot] = await Promise.all([
          getDocs(bookingsQuery),
          getDocs(servicesQuery),
          getDocs(locationsQuery),
          getDocs(hairdressersQuery),
        ]);

        setSetupStatus({
            hasSalons: locationSnapshot.size > 0,
            hasHairdressers: hairdresserSnapshot.size > 0,
            hasServices: serviceSnapshot.size > 0,
        });

        const servicesMap = new Map<string, Service>(serviceSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Service]));
        const hairdressersMap = new Map<string, Hairdresser>(hairdresserSnapshot.docs.map(doc => [doc.id, {id: doc.id, ...doc.data()} as Hairdresser]));
        setSalons(locationSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as LocationDoc) })));

        const washService = Array.from(servicesMap.values()).find(s => s.name.toLowerCase() === 'wash');
        
        let allBookingsInPeriod: Booking[] = bookingSnapshot.docs.map(doc => {
            const data = doc.data() as BookingDoc;
            const service = servicesMap.get(data.serviceId);
            const basePrice = service?.price || 0;
            const finalPrice = (data.washServiceAdded && washService) ? basePrice + washService.price : basePrice;

            return {
                ...data,
                id: doc.id,
                clientId: data.clientId,
                appointmentDateTime: (data.appointmentDateTime as Timestamp).toDate(),
                price: finalPrice,
                washServiceAdded: data.washServiceAdded || false,
                serviceName: service?.name || "Unknown Service",
            } as Booking;
        });
        
        let filteredBookings = allBookingsInPeriod;
        if (user.role === 'admin' && filterSalonId !== 'all') {
            filteredBookings = allBookingsInPeriod.filter(booking => booking.salonId === filterSalonId);
        }

        let totalBookings = 0, totalRevenue = 0, uniqueClients = 0;
        let chartData: any[] = [], popularServices: { name: string; count: number }[] = [], topHairdressers: { name: string; count: number }[] = [];
        let upcomingBookings = 0, todaysSchedule: Booking[] = [];

        if (user.role === 'admin') {
            totalBookings = filteredBookings.length;
            
            const completedBookings = filteredBookings.filter(b => b.status === 'Completed');
            totalRevenue = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);

            const uniqueClientIds = new Set(completedBookings.map(b => b.clientId));
            uniqueClients = uniqueClientIds.size;
            
            const daysInRange = dateRangeFilter === 'today' ? 1 : (dateRangeFilter === '7d' ? 7 : 30);
            chartData = Array.from({ length: daysInRange }).map((_, i) => {
                const date = subDays(today, daysInRange - 1 - i);
                return {
                    date: format(date, "MMM d"),
                    bookings: filteredBookings.filter(b => isSameDay(b.appointmentDateTime, date)).length,
                };
            });

            const serviceCounts = new Map<string, number>();
            completedBookings.forEach(b => serviceCounts.set(b.serviceId, (serviceCounts.get(b.serviceId) || 0) + 1));
            popularServices = Array.from(serviceCounts.entries()).map(([serviceId, count]) => ({ name: servicesMap.get(serviceId)?.name || 'Unknown', count })).sort((a, b) => b.count - a.count).slice(0, 5);

            const hairdresserCounts = new Map<string, number>();
            completedBookings.forEach(b => hairdresserCounts.set(b.hairdresserId, (hairdresserCounts.get(b.hairdresserId) || 0) + 1));
            topHairdressers = Array.from(hairdresserCounts.entries()).map(([hairdresserId, count]) => ({ name: hairdressersMap.get(hairdresserId)?.name || 'Unknown', count })).sort((a, b) => b.count - a.count).slice(0, 5);
        
        } else if (user.role === 'hairdresser') {
            const now = new Date();
            
            const todaysBookingsList = filteredBookings.filter(b => isSameDay(b.appointmentDateTime, now));
            totalBookings = todaysBookingsList.length;
            
            upcomingBookings = filteredBookings.filter(b => b.status === 'Confirmed' && b.appointmentDateTime > endOfDay(now)).length;
            
            todaysSchedule = todaysBookingsList
              .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
              .sort((a, b) => a.appointmentDateTime.getTime() - b.appointmentDateTime.getTime());
        }
        
        setStats({ totalBookings, totalRevenue, uniqueClients, chartData, popularServices, topHairdressers, upcomingBookings, todaysSchedule });

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error Loading Dashboard", description: `Could not load analytics: ${error.message}.`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, filterSalonId, dateRangeFilter]);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  const isAdmin = user.role === 'admin';
  const pageTitle = isAdmin ? "Admin Dashboard" : `Welcome, ${user?.name || 'Hairdresser'}!`;
  const pageDescription = isAdmin ? "Your command center for managing salon operations efficiently." : "Manage your appointments and client interactions.";

  const quickActions = [
    { href: "/bookings/new", label: "New Booking", icon: PlusCircle, roles: ['admin'] },
    ...(isAdmin ? [
      { href: "/locations", label: "Add Salon", icon: Store, roles: ['admin'] },
      { href: "/hairdressers/new", label: "Add Hairdresser", icon: Users, roles: ['admin'] },
      { href: "/services", label: "Add Service", icon: Scissors, roles: ['admin'] },
    ] : [
      { href: "/calendar", label: "My Calendar", icon: CalendarCheck, roles: ['hairdresser'] },
      { href: "/bookings?view=mine", label: "My Bookings", icon: ClipboardList, roles: ['hairdresser'] },
      { href: "/profile", label: "My Profile", icon: UserCog, roles: ['hairdresser'] },
    ])
  ].filter(action => action.roles.includes(user.role));
  
  const selectedSalonName = filterSalonId === 'all' ? 'All Salons' : (salons.find(s => s.id === filterSalonId)?.name || '...');
  const dateRangeText = { today: "Today", "7d": "in the last 7 days", "30d": "in the last 30 days" };
  const statDescription = `For ${selectedSalonName} ${dateRangeText[dateRangeFilter]}`;
  
  const getStatusBadgeVariant = (status: Booking['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Completed': return 'outline';
      default: return 'secondary';
    }
  };

  const SetupGuide = ({ status }: { status: { hasSalons: boolean, hasHairdressers: boolean, hasServices: boolean }}) => {
    const setupItems = [
        { title: "Add your first Salon", description: "Create a location where bookings can be made.", href: "/locations", isComplete: status.hasSalons },
        { title: "Add your first Hairdresser", description: "Add a team member to assign to bookings.", href: "/hairdressers/new", isComplete: status.hasHairdressers },
        { title: "Add your first Service", description: "Define a service that clients can book.", href: "/services", isComplete: status.hasServices },
    ];
    return (
        <Card className="shadow-lg rounded-lg bg-primary/10 border-primary/30">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary"/>Setup Guide</CardTitle>
                <CardDescription className="font-body">Complete these steps to get your salon up and running.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {setupItems.map((item, index) => (
                        <li key={item.title}>
                            <Card className={cn("transition-all", item.isComplete ? "bg-background/50 border-dashed" : "hover:shadow-md")}>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center", item.isComplete ? "bg-green-500 text-white" : "bg-primary/20 text-primary")}>
                                            {item.isComplete ? <CheckCircle size={20} /> : <span className="font-bold">{index + 1}</span>}
                                        </div>
                                        <div>
                                            <h4 className={cn("font-semibold font-body", item.isComplete && "text-muted-foreground line-through")}>{item.title}</h4>
                                            <p className="text-sm text-muted-foreground font-body">{item.description}</p>
                                        </div>
                                    </div>
                                    {!item.isComplete && <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href={item.href}>Go <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>}
                                </div>
                            </Card>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title={pageTitle} description={pageDescription} icon={BarChartIcon} />
      
      {isAdmin && !isLoading && (!setupStatus.hasSalons || !setupStatus.hasHairdressers || !setupStatus.hasServices) && (
        <SetupGuide status={setupStatus} />
      )}
      
      {isAdmin && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />Dashboard Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-[150px]">
                    <label htmlFor="salon-filter" className="block text-sm font-medium text-muted-foreground mb-1">Salon Location</label>
                    <Select value={filterSalonId} onValueChange={setFilterSalonId} disabled={!setupStatus.hasSalons}>
                        <SelectTrigger id="salon-filter"><SelectValue placeholder="Select Salon..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Salons</SelectItem>
                            {salons.map(salon => <SelectItem key={salon.id} value={salon.id}>{salon.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 min-w-[150px]">
                     <label htmlFor="date-range-filter" className="block text-sm font-medium text-muted-foreground mb-1">Date Range</label>
                    <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value as DateRangeFilter)}>
                        <SelectTrigger id="date-range-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <>
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total Bookings" value={stats?.totalBookings ?? 0} icon={CalendarCheck} description={statDescription} isLoading={isLoading} />
            <StatCard title="Total Revenue" value={`R ${stats?.totalRevenue.toFixed(2) ?? '0.00'}`} icon={DollarSign} description={`Completed bookings ${statDescription}`} isLoading={isLoading} />
            <StatCard title="Unique Clients" value={stats?.uniqueClients ?? 0} icon={Users} description={`Serviced ${dateRangeText[dateRangeFilter]}`} isLoading={isLoading} />
        </section>

        <section className="grid grid-cols-1 gap-6">
          <Card className="shadow-lg rounded-lg">
              <CardHeader>
                  <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><BarChartIcon className="h-5 w-5 text-primary"/>Bookings Overview</CardTitle>
                  <CardDescription className="font-body text-muted-foreground">Overview for ${selectedSalonName} ${dateRangeText[dateRangeFilter]}.</CardDescription>
              </CardHeader>
              <CardContent>
                  {isLoading ? <div className="h-[250px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <BarChart data={stats?.chartData} margin={{ top: 20, right: 20, bottom: 5, left: -10 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
                      </BarChart>
                  </ChartContainer>
                  )}
              </CardContent>
          </Card>
        </section>
        
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/>Popular Services</CardTitle>
                    <CardDescription className="font-body text-muted-foreground">Top completed services ${statDescription}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="h-[250px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                    <ul className="space-y-4">
                        {stats?.popularServices && stats.popularServices.length > 0 ? stats.popularServices.map((service, index) => (
                            <li key={service.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {index === 0 && <Crown className="h-5 w-5 text-yellow-500"/>}
                                    {index > 0 && <span className="font-headline text-lg text-muted-foreground w-5 text-center">{index + 1}</span>}
                                    <span className="font-body text-foreground">{service.name}</span>
                                </div>
                                <span className="font-bold font-headline text-primary">{service.count}</span>
                            </li>
                        )) : <p className="text-center text-muted-foreground font-body py-10">No completed bookings data for this period.</p>}
                    </ul>
                    )}
                </CardContent>
            </Card>
             <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><Award className="h-5 w-5 text-primary"/>Top Hairdressers</CardTitle>
                    <CardDescription className="font-body text-muted-foreground">Based on completed bookings ${statDescription}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="h-[250px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                    <ul className="space-y-4">
                        {stats?.topHairdressers && stats.topHairdressers.length > 0 ? stats.topHairdressers.map((dresser, index) => (
                            <li key={dresser.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {index === 0 && <Crown className="h-5 w-5 text-yellow-500"/>}
                                    {index > 0 && <span className="font-headline text-lg text-muted-foreground w-5 text-center">{index + 1}</span>}
                                    <span className="font-body text-foreground">{dresser.name}</span>
                                </div>
                                <span className="font-bold font-headline text-primary">{dresser.count}</span>
                            </li>
                        )) : <p className="text-center text-muted-foreground font-body py-10">No completed bookings data for this period.</p>}
                    </ul>
                    )}
                </CardContent>
            </Card>
        </section>
        </>
      ) : (
        <>
        <section className="grid gap-6 md:grid-cols-2">
           <StatCard title="My Bookings Today" value={stats?.totalBookings ?? 0} icon={CalendarCheck} isLoading={isLoading} />
           <StatCard title="My Upcoming Appointments" value={stats?.upcomingBookings ?? 0} icon={ClipboardList} description="All other confirmed bookings" isLoading={isLoading} />
        </section>
        <section className="mt-6">
            <Card className="shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary"/>Today's Schedule</CardTitle>
                    <CardDescription className="font-body">Your confirmed and completed appointments for today.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                ) : stats?.todaysSchedule && stats.todaysSchedule.length > 0 ? (
                    <ul className="space-y-4">
                    {stats.todaysSchedule.map(booking => (
                        <li key={booking.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 border">
                        <div className="text-lg font-bold font-headline text-primary pt-1 w-20 text-center">
                            {format(booking.appointmentDateTime, "p")}
                        </div>
                        <div className="flex-1 border-l pl-4">
                            <div className="flex justify-between items-center">
                            <p className="font-semibold text-foreground font-body">{booking.clientName}</p>
                            <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <Scissors size={14}/> {booking.serviceName}
                            </p>
                            {booking.washServiceAdded && (
                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                                    <Droplets size={12}/> Wash Included
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <Store size={14}/> {salons.find(s => s.id === booking.salonId)?.name || 'N/A'}
                            </p>
                        </div>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <div className="text-center py-10">
                    <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 font-body text-muted-foreground">You have no appointments scheduled for today.</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </section>
        </>
      )}

       <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-foreground">Quick Actions</CardTitle>
            <CardDescription className="font-body text-muted-foreground">Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <Button key={action.href} variant="outline" asChild className="justify-start text-left h-auto py-3 font-body hover:bg-accent/50">
                <Link href={action.href} className="flex items-center gap-3">
                  <action.icon className="h-5 w-5 text-primary" />
                  <span>{action.label}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
    </div>
  );
}

    