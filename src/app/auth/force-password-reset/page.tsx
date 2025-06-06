
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ForcePasswordResetPage() {
  const { user, firebaseUser, sendPasswordReset, updateHairdresserPasswordResetFlag, logout, loading } = useAuth();
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // If user is not a hairdresser, or doesn't need a password reset, or is not logged in, redirect.
    if (!loading && (!user || user.role !== 'hairdresser' || !user.must_reset_password)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleSendResetEmail = async () => {
    if (!firebaseUser || !firebaseUser.email || !user || !user.uid) {
      toast({ title: "Error", description: "User information not available.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    const success = await sendPasswordReset(firebaseUser.email);
    if (success) {
      // After successfully sending the email, update the flag in Firestore.
      await updateHairdresserPasswordResetFlag(user.uid, false);
      toast({ title: "Password Reset Email Sent", description: `An email has been sent to ${firebaseUser.email} with instructions to reset your password.` });
      setEmailSent(true);
      // Optional: Automatically log out the user after sending the reset email
      // await logout(); 
      // router.push('/login?message=reset_email_sent');
    } else {
      // Error toast is handled by sendPasswordReset function in AuthContext
    }
    setIsSending(false);
  };

  if (loading || !user || user.role !== 'hairdresser' || !user.must_reset_password) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="bg-primary/10 p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-headline text-primary-foreground tracking-wider">
            Update Your Password
          </CardTitle>
          <CardDescription className="text-md text-primary-foreground/80 font-body mt-2">
            For security, please set a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-6">
          {!emailSent ? (
            <>
              <p className="font-body text-center text-muted-foreground">
                Welcome, {user.name}! To continue, please reset your temporary password.
                Click the button below to send a password reset link to your email: <strong>{user.email}</strong>.
              </p>
              <Button 
                onClick={handleSendResetEmail} 
                disabled={isSending} 
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-3 font-headline rounded-lg shadow-md"
              >
                {isSending ? "Sending Email..." : "Send Password Reset Email"}
                {!isSending && <KeyRound className="ml-2 h-5 w-5" />}
              </Button>
            </>
          ) : (
            <Alert variant="default" className="bg-green-50 border-green-300">
              <MailCheck className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700 font-headline">Reset Email Sent!</AlertTitle>
              <AlertDescription className="text-green-600 font-body">
                Please check your email inbox (and spam folder) for the password reset link.
                Once you have reset your password, you can log out and log back in with your new credentials.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="p-4 sm:p-6 bg-secondary/30 flex flex-col items-center space-y-2">
           {emailSent && (
             <Button onClick={logout} variant="outline" className="w-full">
                Log Out
            </Button>
           )}
          <p className="text-xs text-muted-foreground font-body">
            If you encounter any issues, please contact an administrator.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

    