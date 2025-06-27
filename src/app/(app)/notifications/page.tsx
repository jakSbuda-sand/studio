
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Bell, Mail, MessageSquare, CheckCircle, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          <CardTitle className="font-headline text-xl">Notification System Status</CardTitle>
          <CardDescription className="font-body">
            This system automatically sends notifications to clients to keep them informed and reduce no-shows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-secondary/30 rounded-md border-l-4 border-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">Email Confirmations</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Clients with an email on file will now automatically receive a booking confirmation when a new appointment is created for them.
                </p>
                 <Badge variant="outline" className="mt-2 border-green-500 text-green-700">ACTIVE</Badge>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 rounded-md border-l-4 border-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">SMS & Email Reminders</CardTitle>
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Upcoming features will include automated 24-hour reminders via Email and SMS to further reduce no-shows.
                </p>
                <Badge variant="outline" className="mt-2 border-amber-500 text-amber-700">COMING SOON</Badge>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative h-64 w-full rounded-lg overflow-hidden shadow-md mt-6">
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
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                Note: Email sending requires integration with a third-party service like SendGrid. The backend is now ready for this integration.
            </p>
         </CardFooter>
      </Card>
    </div>
  );
}
