
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, ShieldAlert, FileClock, MailCheck, AlertCircle, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db, collection, getDocs, query, orderBy, Timestamp } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import type { NotificationDoc } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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


  if (!user && !isLoading) {
    router.replace('/login');
    return null;
  }
  
  if (user && user.role !== 'admin') {
    return (
      <div className="space-y-8 flex flex-col items-center justify-center h-full">
        <Card className="text-center py-12 shadow-lg rounded-lg max-w-md">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
            <CardTitle className="mt-4 text-2xl font-headline">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-lg">
              You do not have permission to view the notification log.
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
        title="Notification Log"
        description="A history of all automated notification events, such as booking confirmations."
        icon={Bell}
      />
      
      <Alert>
        <MailCheck className="h-4 w-4" />
        <AlertTitle className="font-headline">How it Works</AlertTitle>
        <AlertDescription className="font-body">
          This log shows all notifications queued by the system. A background function processes these items, sends the email via Resend, and updates the status here. 'Pending' means it's waiting to be sent, 'Sent' confirms delivery to the email service, and 'Failed' indicates an error.
        </AlertDescription>
      </Alert>


      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">System Events</CardTitle>
          <CardDescription className="font-body">
            Showing the latest 50 notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <span className="ml-2 font-body">Loading Notification Log...</span>
            </div>
           ) : notifications.length === 0 ? (
            <div className="text-center py-10">
              <FileClock className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-body text-muted-foreground">No notification events have been recorded yet.</p>
            </div>
           ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-headline">Date</TableHead>
                        <TableHead className="font-headline">Recipient</TableHead>
                        <TableHead className="font-headline">Type</TableHead>
                        <TableHead className="font-headline">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map((log) => (
                        <TableRow key={log.id} className="font-body">
                            <TableCell>
                                {log.created_at ? 
                                    <div className="flex flex-col">
                                        <span>{format((log.created_at as Timestamp).toDate(), "MMM dd, yyyy 'at' HH:mm")}</span>
                                        <span className="text-xs text-muted-foreground">{formatDistanceToNow((log.created_at as Timestamp).toDate(), { addSuffix: true })}</span>
                                    </div>
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-muted-foreground" />
                                    {log.recipient_email || "N/A"}
                                </div>
                            </TableCell>
                            <TableCell className="capitalize">{log.template_id || log.type}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(log.status)}>{log.status}</Badge>
                                {log.status === 'failed' && (
                                    <p className="text-xs text-destructive mt-1 max-w-xs truncate" title={log.error_message}>{log.error_message}</p>
                                )}
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
