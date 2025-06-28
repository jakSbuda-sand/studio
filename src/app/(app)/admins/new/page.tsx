
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminForm, type AdminFormValues } from "@/components/forms/AdminForm";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { functions, httpsCallable } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export default function NewAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddAdmin = async (data: AdminFormValues) => {
    if (user?.role !== 'admin') {
      toast({ title: "Permission Denied", description: "You are not authorized to perform this action.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const createAdminUser = httpsCallable(functions, 'createAdminUser');
      const result = await createAdminUser(data);
      toast({ title: "Admin Added", description: (result.data as any).message });
      router.push("/admins");
    } catch (error: any) {
      toast({ title: "Error Adding Admin", description: error.message || "Could not add admin.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (user && user.role !== 'admin') {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Admin"
        description="Fill in the details to add a new system administrator."
        icon={Shield}
      />
      <AdminForm
        onSubmit={handleAddAdmin}
        isLoading={isLoading}
      />
    </div>
  );
}
