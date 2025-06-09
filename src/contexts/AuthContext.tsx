
"use client";

import type { User, UserDoc, HairdresserDoc } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  firebaseSignOut, 
  firebaseSignInWithEmailAndPassword,
  firebaseSendPasswordResetEmail,
  doc,
  getDoc,
  updateDoc
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null; // This is your application's User type
  firebaseUser: FirebaseUser | null; // Raw Firebase Auth user object
  login: (email: string, password_param: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateHairdresserPasswordResetFlag: (hairdresserAuthUid: string, value: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        let appUser: User | null = null;

        // 1. Check 'users' collection (typically for admins)
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userDocData = userDocSnap.data() as UserDoc;
          appUser = {
            uid: fbUser.uid,
            name: userDocData.name || fbUser.displayName, // Prioritize UserDoc name
            email: userDocData.email || fbUser.email,     // Prioritize UserDoc email
            role: userDocData.role,
            avatarUrl: fbUser.photoURL || undefined,
          };
        } else {
          // 2. If not in 'users', check 'hairdressers' collection
          const hairdresserDocRef = doc(db, "hairdressers", fbUser.uid);
          const hairdresserDocSnap = await getDoc(hairdresserDocRef);

          if (hairdresserDocSnap.exists()) {
            const hairdresserData = hairdresserDocSnap.data() as HairdresserDoc;
            appUser = {
              uid: fbUser.uid,
              name: hairdresserData.name || fbUser.displayName, // Prioritize HairdresserDoc name
              email: hairdresserData.email || fbUser.email,   // Prioritize HairdresserDoc email
              role: 'hairdresser',
              avatarUrl: hairdresserData.profilePictureUrl || fbUser.photoURL || undefined,
              must_reset_password: hairdresserData.must_reset_password,
              hairdresserDocId: hairdresserDocSnap.id,
              hairdresserProfileId: fbUser.uid, // Redundant, same as uid
            };
          }
        }

        if (appUser) {
          setUser(appUser);
          // Handle redirection for password reset
          if (appUser.role === 'hairdresser' && appUser.must_reset_password) {
            if (pathname !== '/auth/force-password-reset') {
              router.replace('/auth/force-password-reset');
            }
          } else if (pathname === '/login' || pathname === '/' || pathname === '/auth/force-password-reset') {
            // if password reset page is visited by user who does not need to reset, redirect to dashboard
             router.replace('/dashboard');
          }
        } else {
          console.warn(`User document not found in Firestore for UID: ${fbUser.uid} in 'users' or 'hairdressers' collections. Logging out.`);
          await firebaseSignOut(auth);
          setUser(null);
          setFirebaseUser(null);
          if (pathname !== '/login') router.replace('/login');
        }

      } else { // No Firebase user (logged out)
        setUser(null);
        setFirebaseUser(null);
        const allowedGuestPaths = ['/login', '/auth/force-password-reset', '/'];
        if (!allowedGuestPaths.includes(pathname) && !pathname.startsWith('/_next/')) { // Avoid redirect loops from dev server requests
           // Only redirect if not on an allowed guest path
           // router.replace('/login'); // Consider if automatic redirect is always desired
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const login = async (email: string, password_param: string): Promise<boolean> => {
    setLoading(true);
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, password_param);
      // onAuthStateChanged will handle setting user state and redirection
      setLoading(false);
      return true; 
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive"});
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); // Clear user state immediately
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
      // If current user is this hairdresser, update local state
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

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, logout, loading, sendPasswordReset, updateHairdresserPasswordResetFlag }}>
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
