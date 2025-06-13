
"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Edit3, Mail, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { functions, httpsCallable, firebaseUpdatePassword, auth } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface UpdateUserProfileData {
  name?: string;
  avatarUrl?: string;
}

interface UpdateUserProfileResult {
  status: string;
  message: string;
  updatedName?: string;
  updatedAvatarUrl?: string;
}


export default function ProfilePage() {
  const { user: currentUser, loading: authLoading, logout, refreshAppUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  const [formData, setFormData] = useState<{ name: string; avatarUrl: string }>({ name: "", email: "", avatarUrl: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeDialogOpen, setPasswordChangeDialogOpen] = useState(false);
  const [showReauthAlert, setShowReauthAlert] = useState(false);


  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "", // email is not editable here, just for consistency
        avatarUrl: currentUser.avatarUrl || "",
      });
    }
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmittingProfile(true);

    const updateData: UpdateUserProfileData = {};
    if (formData.name !== currentUser.name) updateData.name = formData.name;
    if (formData.avatarUrl !== currentUser.avatarUrl) updateData.avatarUrl = formData.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      toast({ title: "No Changes", description: "No information was changed." });
      setIsEditing(false);
      setIsSubmittingProfile(false);
      return;
    }

    try {
      const updateUserProfileFunction = httpsCallable<UpdateUserProfileData, UpdateUserProfileResult>(functions, 'updateUserProfile');
      const result = await updateUserProfileFunction(updateData);

      if (result.data.status === 'success' || result.data.status === 'warning') {
        toast({ title: "Profile Updated", description: result.data.message });
        await refreshAppUser(); // Refresh user data in AuthContext
        setIsEditing(false);
      } else {
        toast({ title: "Update Failed", description: result.data.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Error", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
        toast({ title: "Error", description: "You are not logged in.", variant: "destructive"});
        return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsSubmittingPassword(true);
    setShowReauthAlert(false);
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChangeDialogOpen(false);
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.code === "auth/requires-recent-login") {
        setShowReauthAlert(true);
        toast({ title: "Action Required", description: "For security, please log out and log back in to change your password.", variant: "destructive", duration: 7000 });
      } else {
        toast({ title: "Password Change Failed", description: error.message || "Could not update password.", variant: "destructive" });
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/> <span className="ml-2">Loading profile...</span></div>;
  }

  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen">Please log in to view your profile.</div>;
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
        <form onSubmit={handleProfileSubmit}>
          <CardHeader className="text-center bg-secondary/30 p-8">
            <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={isEditing ? formData.avatarUrl : currentUser.avatarUrl || `https://placehold.co/128x128.png?text=${userInitials}`} alt={currentUser.name || "User"} data-ai-hint="person avatar" />
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
                 <p className="text-lg text-foreground flex items-center gap-2 mt-1">
                    <Mail size={20} className="text-primary" /> {currentUser.email}
                  </p>
                  {isEditing && <FormDescription className="mt-1">Email address cannot be changed here.</FormDescription>}
              </div>
              
              {!isEditing && (
                   <div>
                      <Label className="text-muted-foreground">Password</Label>
                      <Dialog open={passwordChangeDialogOpen} onOpenChange={setPasswordChangeDialogOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline" className="w-full justify-start mt-1 text-muted-foreground hover:bg-accent/50">
                              <KeyRound size={20} className="text-primary mr-2"/> Change Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                           <form onSubmit={handlePasswordChangeSubmit}>
                            <DialogHeader>
                                <DialogTitle className="font-headline">Change Password</DialogTitle>
                                <DialogDescription className="font-body">
                                Enter your new password below.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4 font-body">
                                {showReauthAlert && (
                                   <Alert variant="destructive">
                                      <ShieldCheck className="h-4 w-4" />
                                      <AlertTitle>Re-authentication Required</AlertTitle>
                                      <AlertDescription>
                                        For security, you need to log out and log back in before changing your password.
                                      </AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-1">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Must be at least 6 characters" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={isSubmittingPassword}>Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmittingPassword}>
                                    {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Change Password
                                </Button>
                            </DialogFooter>
                           </form>
                        </DialogContent>
                      </Dialog>
                  </div>
              )}

              {isEditing && (
                <CardFooter className="p-0 pt-4 flex gap-4">
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingProfile}>
                    {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setFormData({ name: currentUser.name || "", email: currentUser.email || "", avatarUrl: currentUser.avatarUrl || "" }); }} className="flex-1" disabled={isSubmittingProfile}>
                    Cancel
                  </Button>
                </CardFooter>
              )}
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

// Minimal FormDescription component if not available globally
const FormDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>
);

// Minimal cn utility if not available globally (usually from @/lib/utils)
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

    