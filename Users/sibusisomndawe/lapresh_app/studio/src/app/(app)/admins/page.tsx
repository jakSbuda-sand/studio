
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, UserDoc } from "@/lib/types";
import { Shield, PlusCircle, Mail, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, query, where, orderBy } from "@/lib/firebase";

export default function AdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const fetchAdmins = async () => {
      setIsLoading(true);
      try {
        const usersCol = collection(db, "users");
        const adminsQuery = query(usersCol, where("role", "==", "admin"), orderBy("name", "asc"));
        const adminSnapshot = await getDocs(adminsQuery);
        
        const adminList = adminSnapshot.docs.map(doc => {
          const data = doc.data() as UserDoc;
          return {
            uid: doc.id,
            name: data.name,
            email: data.email,
            role: data.role,
          } as User;
        });
        setAdmins(adminList);
      } catch (error: any) {
        toast({ title: "Error Fetching Admins", description: `Could not load admin data: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmins();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-body">Loading Admins...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Management"
        description="View and manage system administrators."
        icon={Shield}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admins/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Admin
            </Link>
          </Button>
        }
      />
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline">Administrator List</CardTitle>
          <CardDescription className="font-body">A list of all users with admin privileges.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline w-[80px]">Avatar</TableHead>
                <TableHead className="font-headline">Name</TableHead>
                <TableHead className="font-headline">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((adminUser) => (
                <TableRow key={adminUser.uid} className="font-body">
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={adminUser.avatarUrl} alt={adminUser.name || 'Admin'} data-ai-hint="person avatar" />
                      <AvatarFallback className="bg-primary/20 text-primary font-headline">
                        {adminUser.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{adminUser.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={14} />
                      {adminUser.email}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
