
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Display a loading skeleton or a blank page while checking auth state and redirecting
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-8">
        <Skeleton className="h-48 w-full max-w-md rounded-xl" />
        <Skeleton className="h-10 w-3/4 max-w-md mt-4 rounded-md" />
        <Skeleton className="h-10 w-1/2 max-w-md mt-2 rounded-md" />
    </div>
  );
}
