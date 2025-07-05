
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { LogIn, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { login, sendPasswordReset } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    // Redirection is handled by the AuthContext, so no need for router.push here.
    setIsLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive"});
      return;
    }
    setIsResetting(true);
    const success = await sendPasswordReset(resetEmail);
    if (success) {
      toast({ title: "Password Reset Sent", description: `If an account exists for ${resetEmail}, a reset link has been sent.`, variant: "default"});
      // Manually find and click the close button to dismiss the dialog
      const closeButton = document.querySelector('[data-radix-dialog-close]');
      if (closeButton instanceof HTMLElement) {
          closeButton.click();
      }
      setResetEmail("");
    }
    setIsResetting(false);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4 sm:p-8">
       <Card className="w-full max-w-md shadow-2xl overflow-hidden rounded-xl">
        <CardHeader className="bg-primary/10 p-8 text-center flex flex-col items-center">
          <div className="mb-4">
            <Image src="/logo.png" alt="LaPresh Beauty Logo" width={240} height={60} priority />
          </div>
          <CardTitle className="text-4xl sm:text-5xl font-headline text-primary-foreground tracking-wider invisible h-0">
            LaPresh Beauty Salon
          </CardTitle>
          <CardDescription className="text-lg text-primary-foreground/80 font-body mt-2">
            Admin & Staff Login
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-body text-muted-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-body text-muted-foreground">Password</Label>
                <Dialog onOpenChange={() => setResetEmail('')}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-xs font-body">
                      Forgot Password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-headline">Forgot Password</DialogTitle>
                      <DialogDescription className="font-body">
                        Enter your email address below and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reset-email" className="text-right font-body">
                          Email
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="col-span-3 font-body"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                         <Button type="button" variant="secondary" disabled={isResetting}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="button" onClick={handlePasswordReset} disabled={isResetting}>
                        {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-body"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-3 font-headline rounded-lg shadow-md transition-transform hover:scale-105">
              {isLoading ? "Logging in..." : "Log In"}
              {!isLoading && <LogIn className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="p-4 sm:p-6 bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground font-body">
                Enter your registered email and password.
            </p>
        </CardFooter>
      </Card>
      <footer className="mt-8 text-center text-muted-foreground font-body">
        <p>&copy; {new Date().getFullYear()} LaPresh Beauty Salon. All rights reserved.</p>
      </footer>
    </div>
  );
}
