
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, DollarSign, Users, CalendarCheck, ClipboardList, MapPin, PlusCircle, Store, UserCog, TrendingUp, Loader2, Crown, Scissors } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Booking, Service, Client, ServiceDoc, BookingDoc, ClientDoc } from "@/lib/types";
import { db, collection, getDocs, query, where, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  bookingsToday: number;
  revenueToday: number;
  newClientsToday: number;
  weeklyChartData: any[];
  popularServices: { name: string; count: number }[];
  upcomingBookings?: number; // Added for hairdresser
}

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const todayStart = startOfDay(today);
        const sevenDaysAgo = startOfDay(subDays(today, 6));

        let bookingsQuery;
        // Adjust query based on role
        if (user.role === 'admin') {
           bookingsQuery = query(collection(db, "bookings"), where("appointmentDateTime", ">=", Timestamp.fromDate(sevenDaysAgo)), orderBy("appointmentDateTime", "desc"));
        } else if (user.role === 'hairdresser' && user.hairdresserProfileId) {
           bookingsQuery = query(collection(db, "bookings"), where("hairdresserId", "==", user.hairdresserProfileId), where("appointmentDateTime", ">=", Timestamp.fromDate(todayStart)), orderBy("appointmentDateTime", "desc"));
        } else {
            setStats({ bookingsToday: 0, revenueToday: 0, newClientsToday: 0, weeklyChartData: [], popularServices: [] });
            setIsLoading(false);
            return;
        }

        const servicesQuery = query(collection(db, "services"));
        const clientsQuery = user.role === 'admin' ? query(collection(db, "clients"), where("firstSeen", ">=", Timestamp.fromDate(todayStart))) : null;

        const [bookingSnapshot, serviceSnapshot, newClientSnapshot] = await Promise.all([
          getDocs(bookingsQuery),
          getDocs(servicesQuery),
          clientsQuery ? getDocs(clientsQuery) : Promise.resolve(null),
        ]);

        const servicesMap = new Map<string, Service>(serviceSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Service]));
        
        const allBookings: Booking[] = bookingSnapshot.docs.map(doc => {
            const data = doc.data() as BookingDoc;
            const service = servicesMap.get(data.serviceId);
            return {
                ...data,
                id: doc.id,
                appointmentDateTime: (data.appointmentDateTime as Timestamp).toDate(),
                price: service?.price || 0
            } as Booking;
        });

        // --- Calculate Stats ---
        const bookingsToday = allBookings.filter(b => isSameDay(b.appointmentDateTime, today)).length;
        
        let revenueToday = 0;
        let newClientsToday = 0;
        let weeklyChartData: any[] = [];
        let popularServices: { name: string; count: number }[] = [];
        let upcomingBookings = 0;

        if (user.role === 'admin') {
            revenueToday = allBookings
                .filter(b => b.status === 'Completed' && isSameDay(b.appointmentDateTime, today))
                .reduce((sum, b) => sum + (b.price || 0), 0);
            
            newClientsToday = newClientSnapshot ? newClientSnapshot.size : 0;

            weeklyChartData = Array.from({ length: 7 }).map((_, i) => {
                const date = subDays(today, i);
                return {
                    date: format(date, "MMM d"),
                    bookings: allBookings.filter(b => isSameDay(b.appointmentDateTime, date)).length,
                };
            }).reverse();

            const serviceCounts = new Map<string, number>();
            allBookings.filter(b => b.status === 'Completed').forEach(b => {
                serviceCounts.set(b.serviceId, (serviceCounts.get(b.serviceId) || 0) + 1);
            });

            popularServices = Array.from(serviceCounts.entries())
                .map(([serviceId, count]) => ({
                    name: servicesMap.get(serviceId)?.name || 'Unknown Service',
                    count
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        } else if (user.role === 'hairdresser') {
            // Calculate total upcoming bookings for hairdresser
            upcomingBookings = allBookings.filter(b => b.status === 'Confirmed' && b.appointmentDateTime >= today).length;
        }

        setStats({
          bookingsToday,
          revenueToday,
          newClientsToday,
          weeklyChartData,
          popularServices,
          upcomingBookings
        });

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error Loading Dashboard", description: `Could not load analytics: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  const isAdmin = user.role === 'admin';
  const pageTitle = isAdmin ? "Admin Dashboard" : `Welcome, ${user?.name || 'Hairdresser'}!`;
  const pageDescription = isAdmin ? "Your command center for managing salon operations efficiently." : "Manage your appointments and client interactions.";

  const quickActions = [
    { href: "/bookings/new", label: "New Booking", icon: PlusCircle, roles: ['admin', 'hairdresser'] },
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

  return (
    <div className="space-y-8">
      <PageHeader title={pageTitle} description={pageDescription} icon={BarChartIcon} />

      {isAdmin ? (
        <>
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Bookings Today" value={stats?.bookingsToday ?? 0} icon={CalendarCheck} isLoading={isLoading} />
            <StatCard title="Revenue Today" value={`R ${stats?.revenueToday.toFixed(2) ?? '0.00'}`} icon={DollarSign} isLoading={isLoading} />
            <StatCard title="New Clients Today" value={stats?.newClientsToday ?? 0} icon={Users} isLoading={isLoading} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="shadow-lg rounded-lg lg:col-span-3">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><BarChartIcon className="h-5 w-5 text-primary"/>Bookings This Week</CardTitle>
                    <CardDescription className="font-body text-muted-foreground">Overview of appointments in the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="h-[250px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart data={stats?.weeklyChartData} margin={{ top: 20, right: 20, bottom: 5, left: -10 }}>
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
            <Card className="shadow-lg rounded-lg lg:col-span-2">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/>Popular Services</CardTitle>
                    <CardDescription className="font-body text-muted-foreground">Top services based on completed bookings.</CardDescription>
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
                        )) : <p className="text-center text-muted-foreground font-body py-10">No completed bookings data yet.</p>}
                    </ul>
                    )}
                </CardContent>
            </Card>
        </section>
        </>
      ) : (
        // --- Hairdresser-specific dashboard (simplified) ---
        <section className="grid gap-6 md:grid-cols-2">
           <StatCard title="My Bookings Today" value={stats?.bookingsToday ?? 0} icon={CalendarCheck} isLoading={isLoading} />
           <StatCard title="My Upcoming Appointments" value={stats?.upcomingBookings ?? 0} icon={ClipboardList} description="All confirmed future bookings" isLoading={isLoading} />
        </section>
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
