
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
  firebaseUpdatePassword, 
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
  refreshAppUser: () => Promise<void>; 
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
        console.log("AuthContext: Admin user data set:", JSON.stringify(appUser, null, 2));
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
            hairdresserDocId: hairdresserDocSnap.id, 
            hairdresserProfileId: fbUser.uid, 
          };
          console.log("AuthContext: Hairdresser user data set:", JSON.stringify(appUser, null, 2));
        }
      }

      if (appUser) {
        setUser(appUser);
        if (appUser.role === 'hairdresser' && appUser.must_reset_password) {
          if (pathname !== '/auth/force-password-reset') {
            console.log("AuthContext: Redirecting hairdresser to force password reset.");
            router.replace('/auth/force-password-reset');
          }
        } else if (pathname === '/login' || pathname === '/' || pathname === '/auth/force-password-reset') {
           console.log("AuthContext: User authenticated, redirecting to dashboard.");
           router.replace('/dashboard');
        }
      } else {
        console.warn(`AuthContext: User document not found in Firestore for UID: ${fbUser.uid}. Logging out.`);
        await firebaseSignOut(auth); 
        setUser(null);
        setFirebaseUser(null);
        if (pathname !== '/login') {
          console.log("AuthContext: No app user found, redirecting to login.");
          router.replace('/login');
        }
      }
    } else {
      setUser(null);
      setFirebaseUser(null);
      const allowedGuestPaths = ['/login', '/auth/force-password-reset', '/'];
      if (!allowedGuestPaths.includes(pathname) && !pathname.startsWith('/_next/')) {
        console.log(`AuthContext: User not authenticated, current path ${pathname} is not allowed guest path. Redirecting to login.`);
        // router.replace('/login'); // This can cause redirect loops if not handled carefully, e.g. on initial load of /
      }
    }
    setLoading(false);
  }, [router, pathname]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user:", fbUser ? fbUser.uid : null);
      setLoading(true); 
      if (fbUser) {
        try {
          console.log("AuthContext: Attempting to refresh ID token for:", fbUser.uid);
          await fbUser.getIdToken(true); // Force refresh token
          console.log("AuthContext: ID token refreshed for:", fbUser.uid);
        } catch (error) {
          console.warn("AuthContext: Failed to refresh auth token during onAuthStateChanged:", error);
        }
      }
      await fetchAndSetAppUser(fbUser);
    });
    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, [fetchAndSetAppUser]);

  const login = async (email: string, password_param: string): Promise<boolean> => {
    setLoading(true);
    try {
      console.log("AuthContext: Attempting login for email:", email);
      await firebaseSignInWithEmailAndPassword(auth, email, password_param);
      // onAuthStateChanged handles user state and setLoading(false)
      console.log("AuthContext: Login successful for email:", email);
      return true; 
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive"});
      setLoading(false); 
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      console.log("AuthContext: Attempting logout.");
      await firebaseSignOut(auth);
      setUser(null); 
      setFirebaseUser(null);
      router.push('/login');
      console.log("AuthContext: Logout successful.");
    } catch (error) {
      console.error("AuthContext: Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive"});
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
      console.log("AuthContext: Sending password reset email to:", email);
      await firebaseSendPasswordResetEmail(auth, email);
      console.log("AuthContext: Password reset email sent successfully to:", email);
      return true;
    } catch (error: any) {
      console.error("AuthContext: Send password reset email error:", error);
      toast({title: "Error", description: error.message || "Could not send password reset email.", variant: "destructive"});
      return false;
    }
  };

  const updateHairdresserPasswordResetFlag = async (hairdresserAuthUid: string, value: boolean): Promise<boolean> => {
    try {
      console.log(`AuthContext: Updating must_reset_password flag for UID ${hairdresserAuthUid} to ${value}`);
      const hairdresserDocRef = doc(db, "hairdressers", hairdresserAuthUid);
      await updateDoc(hairdresserDocRef, { must_reset_password: value });
      if (user && user.uid === hairdresserAuthUid) {
        setUser(prev => prev ? ({ ...prev, must_reset_password: value }) : null);
      }
      console.log(`AuthContext: Successfully updated must_reset_password flag for UID ${hairdresserAuthUid}`);
      return true;
    } catch (error: any) {
      console.error("AuthContext: Error updating must_reset_password flag:", error);
      toast({title: "Error", description: "Failed to update password reset status.", variant: "destructive"});
      return false;
    }
  };

  const refreshAppUser = async () => {
    const currentFbUser = auth.currentUser;
    if (currentFbUser) {
      setLoading(true);
      console.log("AuthContext (refreshAppUser): Current Firebase user UID:", currentFbUser.uid);
      try {
        console.log("AuthContext (refreshAppUser): Attempting to force refresh user token for latest profile data...");
        await currentFbUser.getIdToken(true);
        console.log("AuthContext (refreshAppUser): User token refreshed. Re-fetching app user data.");
      } catch (error) {
        console.warn("AuthContext (refreshAppUser): Failed to refresh auth token during refreshAppUser:", error);
      }
      await fetchAndSetAppUser(currentFbUser); 
    } else {
        console.log("AuthContext (refreshAppUser): refreshAppUser called but no current Firebase user.");
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

