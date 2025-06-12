
"use client";

import type { User, UserDoc, HairdresserDoc } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  firebaseSignOut, 
  firebaseSignInWithEmailAndPassword,
  firebaseSendPasswordResetEmail,
  firebaseUpdatePassword, // Ensure this is imported for direct use or re-export
  doc,
  getDoc,
  updateDoc
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null; 
  firebaseUser: FirebaseUser | null;
  login: (email: string, password_param: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateHairdresserPasswordResetFlag: (hairdresserAuthUid: string, value: boolean) => Promise<boolean>;
  refreshAppUser: () => Promise<void>; // New method
  // firebaseUpdatePassword is directly available from @/lib/firebase
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchAndSetAppUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      setFirebaseUser(fbUser);
      let appUser: User | null = null;

      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userDocData = userDocSnap.data() as UserDoc;
        appUser = {
          uid: fbUser.uid,
          name: userDocData.name || fbUser.displayName,
          email: userDocData.email || fbUser.email,
          role: userDocData.role,
          avatarUrl: fbUser.photoURL || undefined,
        };
      } else {
        const hairdresserDocRef = doc(db, "hairdressers", fbUser.uid);
        const hairdresserDocSnap = await getDoc(hairdresserDocRef);

        if (hairdresserDocSnap.exists()) {
          const hairdresserData = hairdresserDocSnap.data() as HairdresserDoc;
          appUser = {
            uid: fbUser.uid,
            name: hairdresserData.name || fbUser.displayName,
            email: hairdresserData.email || fbUser.email,
            role: 'hairdresser',
            avatarUrl: hairdresserData.profilePictureUrl || fbUser.photoURL || undefined,
            must_reset_password: hairdresserData.must_reset_password,
            hairdresserDocId: hairdresserDocSnap.id, // This is user_id / uid
            hairdresserProfileId: fbUser.uid, 
          };
        }
      }

      if (appUser) {
        setUser(appUser);
        if (appUser.role === 'hairdresser' && appUser.must_reset_password) {
          if (pathname !== '/auth/force-password-reset') {
            router.replace('/auth/force-password-reset');
          }
        } else if (pathname === '/login' || pathname === '/' || pathname === '/auth/force-password-reset') {
           router.replace('/dashboard');
        }
      } else {
        console.warn(`User document not found in Firestore for UID: ${fbUser.uid}. Logging out.`);
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        if (pathname !== '/login') router.replace('/login');
      }
    } else {
      setUser(null);
      setFirebaseUser(null);
      const allowedGuestPaths = ['/login', '/auth/force-password-reset', '/'];
        if (!allowedGuestPaths.includes(pathname) && !pathname.startsWith('/_next/')) {
           // router.replace('/login'); // Keep this commented or refine logic if needed
        }
    }
    setLoading(false);
  }, [router, pathname]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      await fetchAndSetAppUser(fbUser);
    });
    return () => unsubscribe();
  }, [fetchAndSetAppUser]);

  const login = async (email: string, password_param: string): Promise<boolean> => {
    setLoading(true);
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, password_param);
      // onAuthStateChanged + fetchAndSetAppUser will handle setting user state and redirection
      return true; 
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive"});
      setLoading(false);
      return false;
    }
    // setLoading(false) will be called by fetchAndSetAppUser
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); 
      setFirebaseUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive"});
    } finally {
        setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      console.error("Send password reset email error:", error);
      toast({title: "Error", description: error.message || "Could not send password reset email.", variant: "destructive"});
      return false;
    }
  };

  const updateHairdresserPasswordResetFlag = async (hairdresserAuthUid: string, value: boolean): Promise<boolean> => {
    try {
      const hairdresserDocRef = doc(db, "hairdressers", hairdresserAuthUid);
      await updateDoc(hairdresserDocRef, { must_reset_password: value });
      if (user && user.uid === hairdresserAuthUid) {
        setUser(prev => prev ? ({ ...prev, must_reset_password: value }) : null);
      }
      return true;
    } catch (error: any) {
      console.error("Error updating must_reset_password flag:", error);
      toast({title: "Error", description: "Failed to update password reset status.", variant: "destructive"});
      return false;
    }
  };

  const refreshAppUser = async () => {
    const currentFbUser = auth.currentUser; // Get the most up-to-date Firebase user
    if (currentFbUser) {
      setLoading(true);
      await fetchAndSetAppUser(currentFbUser); // Re-run the user fetching logic
    }
  };


  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, logout, loading, sendPasswordReset, updateHairdresserPasswordResetFlag, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    