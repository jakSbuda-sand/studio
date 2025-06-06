import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-8">
      <Card className="w-full max-w-md shadow-2xl overflow-hidden rounded-xl">
        <CardHeader className="bg-primary/10 p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Scissors className="h-10 w-10" />
          </div>
          <CardTitle className="text-5xl font-headline text-primary-foreground tracking-wider">
            SalonVerse
          </CardTitle>
          <CardDescription className="text-lg text-primary-foreground/80 font-body mt-2">
            Elegance & Efficiency, Reimagined.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <p className="text-center text-lg text-foreground/90 font-body leading-relaxed">
            Welcome to SalonVerse, your all-in-one solution for modern salon management. Streamline your bookings, manage your team, and delight your clients.
          </p>
          <div className="relative h-48 w-full rounded-lg overflow-hidden shadow-md">
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="Modern salon interior" 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="salon interior" 
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-secondary/30">
          <Button asChild size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-6 font-headline rounded-lg shadow-md transition-transform hover:scale-105">
            <Link href="/dashboard">Access Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
      <footer className="mt-12 text-center text-muted-foreground font-body">
        <p>&copy; {new Date().getFullYear()} SalonVerse. All rights reserved.</p>
        <p className="text-sm">Crafted with care for the modern salon.</p>
      </footer>
    </div>
  );
}
