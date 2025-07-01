
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, ShieldAlert, Mail, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, query, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import type { NotificationDoc } from "@/lib/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

// Extended type for UI display
type NotificationLog = NotificationDoc & { id: string; };

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const notificationsCol = collection(db, "notifications");
        const q = query(notificationsCol, orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        const notificationsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as NotificationLog));
        setNotifications(notificationsList);
      } catch (error: any) {
        console.error("Error fetching notifications:", error);
        toast({ title: "Error", description: "Could not load notification history.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const getStatusBadgeVariant = (status: NotificationDoc['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent': return 'default'; // default is primary
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };


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
        description="Monitor automated booking confirmations and reminders."
        icon={Bell}
      />
      
       <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-secondary/30 rounded-md border-l-4 border-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">Email Confirmations</CardTitle>
                <Mail className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Booking confirmations are automatically queued for sending via email.
                </p>
                 <Badge variant="outline" className="mt-2 border-green-500 text-green-700">ACTIVE</Badge>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 rounded-md border-l-4 border-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium font-body text-secondary-foreground">SMS Reminders</CardTitle>
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">
                  Automated 24-hour reminders via SMS are a planned future feature.
                </p>
                <Badge variant="outline" className="mt-2 border-amber-500 text-amber-700">COMING SOON</Badge>
              </CardContent>
            </Card>
        </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Notification Log</CardTitle>
          <CardDescription className="font-body">
            A history of all automated notifications generated by the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 font-body">Loading notifications...</span>
            </div>
           ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-10">No notifications have been generated yet.</p>
           ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-headline">Date</TableHead>
                        <TableHead className="font-headline">Recipient</TableHead>
                        <TableHead className="font-headline">Type</TableHead>
                        <TableHead className="font-headline">Template</TableHead>
                        <TableHead className="font-headline">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map((log) => (
                        <TableRow key={log.id} className="font-body">
                            <TableCell>
                                {log.created_at ? format((log.created_at as Timestamp).toDate(), "MMM dd, yyyy HH:mm") : "N/A"}
                            </TableCell>
                            <TableCell>{log.recipient_email || log.recipient_phone || "N/A"}</TableCell>
                            <TableCell className="capitalize">{log.type}</TableCell>
                            <TableCell>{log.template_id || "N/A"}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(log.status)}>{log.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
