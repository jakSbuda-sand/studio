
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Bell, Mail, MessageSquare, Settings, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return <p>Loading...</p>;

  if (user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
            <CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              You do not have permission to view notification settings.
            </CardDescription>
          </CardContent>
           <CardFooter className="justify-center">
             <Button onClick={() => router.push('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Go to Dashboard
              </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automated Notifications"
        description="Manage automated booking confirmations and reminders."
        icon={Bell}
      />

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Notification System Overview</CardTitle>
          <CardDescription className="font-body">
            LaPresh Beauty Salon automatically sends notifications to clients for booking confirmations and reminders. 
            This helps reduce no-shows and keeps your clients informed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-secondary/30 rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">Email Notifications</CardTitle>
                <Mail className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Clients receive beautifully formatted emails for new bookings, updates, and reminders 24 hours before their appointment.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 rounded-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">SMS Reminders</CardTitle>
                <MessageSquare className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Optional SMS reminders can be configured to send short alerts to clients, further ensuring they remember their appointments. (Feature coming soon)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center p-6 border rounded-lg bg-background">
            <Settings className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-headline text-foreground mb-2">Future Enhancements</h3>
            <p className="text-muted-foreground font-body">
              In future updates, you will be able to customize notification templates, manage SMS credits (if applicable), 
              and view detailed delivery logs directly from this page.
            </p>
          </div>
          
          <div className="relative h-64 w-full rounded-lg overflow-hidden shadow-md">
            <Image 
              src="https://placehold.co/800x400.png" 
              alt="Notification system interface mockup" 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="communication dashboard" 
            />
             <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <p className="text-2xl font-headline text-white text-center p-4">
                    Enhanced Client Communication is Key
                </p>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
