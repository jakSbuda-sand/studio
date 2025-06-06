
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bell, CalendarCheck, ClipboardList, MapPin, PlusCircle, Users, Store, Scissors, UserCog } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/types";

const StatCard = ({ title, value, icon: Icon, description, link, linkText, userRole }: { title: string, value: string | number, icon: React.ElementType, description?: string, link?: string, linkText?: string, userRole?: User['role'] }) => {
  // Hide certain cards or links based on role if needed
  if (title === "Active Salons" && userRole === 'hairdresser') return null;
  if (title === "Available Hairdressers" && userRole === 'hairdresser') return null;
  if (title === "Pending Notifications" && userRole === 'hairdresser') return null;


  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-headline text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground font-body pt-1">{description}</p>}
        {link && linkText && (
          <Button variant="link" asChild className="px-0 pt-2 text-primary font-body">
            <Link href={link}>{linkText}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data for dashboard - this could be dynamic based on user role
  const adminStats = [
    { title: "Total Bookings Today", value: 12, icon: CalendarCheck, description: "+5 from yesterday" },
    { title: "Active Salons", value: 2, icon: Store, link: "/locations", linkText: "Manage Locations" },
    { title: "Available Hairdressers", value: 8, icon: Users, link: "/hairdressers", linkText: "View Hairdressers" },
    { title: "Pending Notifications", value: 3, icon: Bell, link: "/notifications", linkText: "Check Notifications" },
  ];
  
  const hairdresserStats = [
    { title: "My Bookings Today", value: 3, icon: CalendarCheck, description: "View your schedule" },
    { title: "My Upcoming Appointments", value: 7, icon: ClipboardList, link: "/bookings?view=mine", linkText: "View My Bookings" },
    // Add more hairdresser-specific stats if needed
  ];

  const stats = user?.role === 'admin' ? adminStats : hairdresserStats;

  const adminQuickActions = [
    { href: "/bookings/new", label: "New Booking", icon: PlusCircle },
    { href: "/locations", label: "Add Salon", icon: MapPin },
    { href: "/hairdressers", label: "Add Hairdresser", icon: Users },
    { href: "/calendar", label: "View Calendar", icon: CalendarCheck },
  ];

  const hairdresserQuickActions = [
    { href: "/bookings/new", label: "New Booking", icon: PlusCircle }, // Assuming hairdressers can create bookings
    { href: "/calendar", label: "My Calendar", icon: CalendarCheck },
    { href: "/bookings?view=mine", label: "My Bookings", icon: ClipboardList },
    { href: "/profile", label: "My Profile", icon: UserCog },
  ];

  const quickActions = user?.role === 'admin' ? adminQuickActions : hairdresserQuickActions;
  
  const pageTitle = user?.role === 'admin' ? "Welcome to LaPresh Beauty Salon Admin" : `Welcome, ${user?.name || 'Hairdresser'}!`;
  const pageDescription = user?.role === 'admin' ? "Your command center for managing salon operations efficiently." : "Manage your appointments and client interactions.";


  if (!user) return <p>Loading dashboard...</p>;


  return (
    <div className="space-y-8">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        icon={LayoutDashboard}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/bookings/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New Booking
            </Link>
          </Button>
        }
      />

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => <StatCard key={stat.title} {...stat} userRole={user.role}/>)}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-foreground">Quick Actions</CardTitle>
            <CardDescription className="font-body text-muted-foreground">Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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

        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-foreground">Featured Service</CardTitle>
             <CardDescription className="font-body text-muted-foreground">Highlight of the month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-48 w-full rounded-md overflow-hidden">
               <Image 
                src="https://placehold.co/600x300.png" 
                alt="Luxury hair treatment" 
                layout="fill" 
                objectFit="cover" 
                data-ai-hint="hair treatment"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-lg font-headline text-white">Keratin Smoothing Treatment</h3>
                <p className="text-sm text-white/80 font-body">Transform your hair with our premium smoothing service.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      
    </div>
  );
}

function LayoutDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}
