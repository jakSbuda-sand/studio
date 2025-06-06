
"use client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show a loading state or a blank page while redirecting
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-4 mt-8">
                <Skeleton className="h-64 w-1/4" />
                <Skeleton className="h-64 w-3/4" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-1 p-6 bg-background overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
