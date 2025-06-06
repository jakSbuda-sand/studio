
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { LogIn, Scissors } from "lucide-react";
// import Image from "next/image"; // Image component not used here

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const loginSuccessful = await login(email, password);
    // Redirection is handled by AuthContext's onAuthStateChanged effect
    // If login is successful, onAuthStateChanged will pick up the new user
    // and redirect accordingly (e.g., to /dashboard or /auth/force-password-reset).
    // If login fails, the toast is shown by the login function itself.
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4 sm:p-8">
       <Card className="w-full max-w-md shadow-2xl overflow-hidden rounded-xl">
        <CardHeader className="bg-primary/10 p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Scissors className="h-10 w-10" />
          </div>
          <CardTitle className="text-4xl sm:text-5xl font-headline text-primary-foreground tracking-wider">
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
              <Label htmlFor="password" className="font-body text-muted-foreground">Password</Label>
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

    