"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Edit3, Mail, Phone, ShieldCheck, KeyRound } from "lucide-react";
import type { User } from "@/lib/types"; // Assuming User type is defined
import { toast } from "@/hooks/use-toast";

// Mock current user data (replace with actual auth context)
const mockCurrentUser: User = {
  id: "user123",
  name: "Alex Taylor",
  email: "alex.taylor@salonverse.com",
  role: "admin", // or "hairdresser"
  avatarUrl: "https://placehold.co/128x128.png?text=AT",
};

export default function ProfilePage() {
  const [user, setUser] = useState<User>(mockCurrentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" });

  useEffect(() => {
    // In a real app, fetch current user data if not available
    // For now, we use mock data
    setFormData({ name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock update action
    console.log("Updating profile:", formData);
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(prevUser => ({ ...prevUser, ...formData }));
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your profile information has been saved." });
  };
  
  const userInitials = user.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Profile"
        description="View and manage your personal information and settings."
        icon={UserCircle}
        actions={
          !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )
        }
      />

      <Card className="shadow-lg rounded-lg max-w-2xl mx-auto">
        <CardHeader className="text-center bg-secondary/30 p-8">
          <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-primary shadow-lg">
            <AvatarImage src={isEditing ? formData.avatarUrl : user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
            <AvatarFallback className="text-4xl font-headline bg-primary/20 text-primary">{userInitials}</AvatarFallback>
          </Avatar>
          {isEditing ? (
            <Input
              id="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleInputChange}
              placeholder="Avatar URL"
              className="max-w-sm mx-auto font-body"
            />
          ) : (
            <CardTitle className="font-headline text-3xl text-foreground">{user.name}</CardTitle>
          )}
          <CardDescription className="font-body text-lg text-muted-foreground capitalize flex items-center justify-center gap-2 mt-1">
            <ShieldCheck className="h-5 w-5 text-primary" /> {user.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 font-body space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
              {isEditing ? (
                <Input id="name" value={formData.name} onChange={handleInputChange} className="text-lg"/>
              ) : (
                <p className="text-lg text-foreground flex items-center gap-2 mt-1">
                  <UserCircle size={20} className="text-primary" /> {user.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
              {isEditing ? (
                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="text-lg"/>
              ) : (
                 <p className="text-lg text-foreground flex items-center gap-2 mt-1">
                  <Mail size={20} className="text-primary" /> {user.email}
                </p>
              )}
            </div>
            
            {!isEditing && (
                 <div>
                    <Label className="text-muted-foreground">Password</Label>
                    <Button variant="outline" className="w-full justify-start mt-1 text-muted-foreground hover:bg-accent/50">
                        <KeyRound size={20} className="text-primary mr-2"/> Change Password
                    </Button>
                </div>
            )}

            {isEditing && (
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setFormData({ name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" }); }} className="flex-1">
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
