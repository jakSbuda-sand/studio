
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Edit3, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { User } from "@/lib/types"; // Ensure User type is imported

export default function ProfilePage() {
  const { user: currentUser, loading: authLoading, login } = useAuth(); // 'login' for potential re-auth after password change
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{ name: string; email: string; avatarUrl: string }>({ name: "", email: "", avatarUrl: "" });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        avatarUrl: currentUser.avatarUrl || "",
      });
    }
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Mock update action: In a real app, this would call an API
    // For now, we'll just show a toast and update local editing state.
    // The AuthContext would need an updateUser method for persistent changes.
    console.log("Updating profile (mock):", formData);
    await new Promise(resolve => setTimeout(resolve, 500));

    // To reflect changes if AuthContext had an updateUser method:
    // const success = await updateUser({ ...currentUser, ...formData });
    // if (success) {
    //   toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    //   setIsEditing(false);
    // } else {
    //   toast({ title: "Update Failed", description: "Could not update profile.", variant: "destructive" });
    // }
    
    // For current mock setup:
    toast({ title: "Profile Updated (Mock)", description: "Changes are visual only in this demo." });
    // Simulate updating the user object locally for display, though this won't persist in AuthContext
    // without a proper updateUser function there.
    // To see changes immediately, one might update currentUser via a setUser in AuthContext
    // For now, we update local state which then is used by UI when editing
    if (currentUser) {
        // This won't update the actual context, just the form
        // A real update would re-fetch or update the context user
    }
    setIsEditing(false); 
  };
  
  if (authLoading) {
    return <p>Loading profile...</p>;
  }

  if (!currentUser) {
    // This case should ideally be handled by the AppLayout redirecting to login
    return <p>Please log in to view your profile.</p>;
  }

  const userInitials = currentUser.name?.split(" ").map(n => n[0]).join("").toUpperCase() || 'U';

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
            <AvatarImage src={isEditing ? formData.avatarUrl : currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="person avatar" />
            <AvatarFallback className="text-4xl font-headline bg-primary/20 text-primary">{userInitials}</AvatarFallback>
          </Avatar>
          {isEditing ? (
            <Input
              id="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleInputChange}
              placeholder="Avatar URL (e.g., https://placehold.co/128x128.png)"
              className="max-w-sm mx-auto font-body"
            />
          ) : (
            <CardTitle className="font-headline text-3xl text-foreground">{currentUser.name}</CardTitle>
          )}
          <CardDescription className="font-body text-lg text-muted-foreground capitalize flex items-center justify-center gap-2 mt-1">
            <ShieldCheck className="h-5 w-5 text-primary" /> {currentUser.role}
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
                  <UserCircle size={20} className="text-primary" /> {currentUser.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
              {isEditing ? (
                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="text-lg"/>
              ) : (
                 <p className="text-lg text-foreground flex items-center gap-2 mt-1">
                  <Mail size={20} className="text-primary" /> {currentUser.email}
                </p>
              )}
            </div>
            
            {!isEditing && (
                 <div>
                    <Label className="text-muted-foreground">Password</Label>
                    <Button variant="outline" className="w-full justify-start mt-1 text-muted-foreground hover:bg-accent/50" disabled>
                        <KeyRound size={20} className="text-primary mr-2"/> Change Password (Not Implemented)
                    </Button>
                </div>
            )}

            {isEditing && (
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setFormData({ name: currentUser.name, email: currentUser.email, avatarUrl: currentUser.avatarUrl || "" }); }} className="flex-1">
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
